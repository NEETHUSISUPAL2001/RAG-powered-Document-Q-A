from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
import os
from dotenv import load_dotenv

load_dotenv()

import uuid
import asyncio
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, status, Form, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm

# Import our custom modules
from database import connect_to_mongo, close_mongo_connection, get_db
from models import UserCreate, Token, UserUpdate
import auth
import rag
import google_auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()


app = FastAPI(title="RAG Q&A Backend", lifespan=lifespan)

# Setup CORS to allow our React frontend to communicate with this FastAPI backend
_cors_raw = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177",
)
_frontend_url = os.getenv("FRONTEND_URL", "").strip()
ALLOWED_ORIGINS = list({o.strip() for o in _cors_raw.split(",") if o.strip()})
if _frontend_url and _frontend_url not in ALLOWED_ORIGINS:
    ALLOWED_ORIGINS.append(_frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in ALLOWED_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(google_auth.router, prefix="/auth")


# ---------------------------------------------------------
# Authentication Routes
# ---------------------------------------------------------

@app.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate, db=Depends(get_db)):
    """
    Register a new user.
    """
    # 1. Check if the user already exists in MongoDB
    existing_user = await db["users"].find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Hash the password before saving to the database
    hashed_password = auth.get_password_hash(user.password)

    # 3. Create the user dictionary to store in MongoDB
    user_dict = {
        "email": user.email,
        "name": user.name,
        "hashed_password": hashed_password,
        "created_at": datetime.now(timezone.utc),
    }

    # 4. Insert the user into the 'users' collection
    await db["users"].insert_one(user_dict)

    # 5. Automatically log them in by creating a JWT token
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    """
    Login an existing user.
    Note: OAuth2PasswordRequestForm expects 'username' and 'password' in the body,
    but we will treat 'username' as the email.
    """
    # 1. Fetch the user from the database by email
    user = await db["users"].find_one({"email": form_data.username})

    # 2. If user doesn't exist, has no password set, or password doesn't match, throw error
    if not user or not user.get("hashed_password") or not auth.verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. If correct, generate a JWT token
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/users/me")
async def read_users_me(current_user: dict = Depends(auth.get_current_user)):
    """
    Protected route. Only users with a valid JWT can access this.
    The 'auth.get_current_user' dependency ensures the token is valid.
    """
    # Exclude the hashed_password before returning the user profile
    return {
        "_id": str(current_user["_id"]),
        "email": current_user["email"],
        "name": current_user["name"],
        "created_at": current_user.get("created_at"),
    }


@app.put("/users/me")
async def update_users_me(
    update: UserUpdate,
    current_user: dict = Depends(auth.get_current_user),
    db=Depends(get_db),
):
    """
    Protected route to update the current user's name/email.
    """
    updates = {}
    if update.name is not None:
        updates["name"] = update.name
    if update.email is not None and update.email != current_user["email"]:
        existing = await db["users"].find_one({"email": update.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        updates["email"] = update.email

    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")

    await db["users"].update_one({"_id": current_user["_id"]}, {"$set": updates})

    updated = await db["users"].find_one({"_id": current_user["_id"]})
    return {
        "_id": str(updated["_id"]),
        "email": updated["email"],
        "name": updated["name"],
        "created_at": updated.get("created_at"),
    }


# ---------------------------------------------------------
# RAG Endpoints
# ---------------------------------------------------------

@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(auth.get_current_user),
    db=Depends(get_db),
):
    """
    Protected route to upload a PDF.
    Only logged-in users can upload files.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    user_id = current_user["email"]
    doc_id = str(uuid.uuid4())

    # Process the PDF using our RAG pipeline
    try:
        result = await rag.process_pdf(file, user_id, doc_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Track document in MongoDB
    doc_record = {
        "user_email": user_id,
        "doc_id": doc_id,
        "filename": file.filename,
        "created_at": datetime.now(timezone.utc),
    }
    await db["documents"].insert_one(doc_record)

    result["doc_id"] = doc_id
    return result


@app.post("/chat")
async def chat(
    question: str = Form(...),
    doc_id: Optional[str] = Form(None),
    history: str = Form(""),
    current_user: dict = Depends(auth.get_current_user),
    db=Depends(get_db),
):
    """
    Protected route to ask a question.
    It retrieves context from ChromaDB and gets an answer from Groq.
    """
    user_id = current_user["email"]

    # Get the answer from the RAG pipeline (heavy sync work off the event loop)
    try:
        result = await asyncio.to_thread(rag.answer_question, question, user_id, doc_id, history)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"RAG pipeline error: {str(e)}")

    answer = result["answer"]
    sources = result["sources"]

    # Save the chat history to MongoDB
    chat_log = {
        "user_email": user_id,
        "doc_id": doc_id,
        "question": question,
        "answer": answer,
        "sources": sources,
        "created_at": datetime.now(timezone.utc),
    }
    try:
        await db["chat_history"].insert_one(chat_log)
    except Exception as e:
        import traceback
        traceback.print_exc()
        # Don't fail the whole request if only history saving fails
        print(f"Warning: could not save chat history: {e}")

    return {"question": question, "answer": answer, "sources": sources}


@app.get("/documents")
async def get_documents(
    current_user: dict = Depends(auth.get_current_user),
    db=Depends(get_db),
):
    """Fetch all documents uploaded by the user."""
    user_id = current_user["email"]
    cursor = db["documents"].find({"user_email": user_id}).sort("created_at", -1)
    documents = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])  # convert ObjectId to string
        documents.append(doc)
    return documents


@app.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: str,
    current_user: dict = Depends(auth.get_current_user),
    db=Depends(get_db),
):
    """Delete a document's vectors and its chat history for the current user."""
    user_id = current_user["email"]

    doc = await db["documents"].find_one({"user_email": user_id, "doc_id": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove vectors from ChromaDB
    await asyncio.to_thread(rag.delete_document, user_id, doc_id)

    # Remove document record and its chat history from MongoDB
    await db["documents"].delete_one({"user_email": user_id, "doc_id": doc_id})
    await db["chat_history"].delete_many({"user_email": user_id, "doc_id": doc_id})

    return {"message": "Document deleted"}


@app.get("/chat_history/{doc_id}")
async def get_chat_history(
    doc_id: str,
    current_user: dict = Depends(auth.get_current_user),
    db=Depends(get_db),
):
    """Fetch all past chats for a specific document."""
    user_id = current_user["email"]
    cursor = db["chat_history"].find(
        {"user_email": user_id, "doc_id": doc_id}
    ).sort("created_at", 1)
    history = []
    async for chat in cursor:
        chat["_id"] = str(chat["_id"])
        history.append(chat)
    return history
