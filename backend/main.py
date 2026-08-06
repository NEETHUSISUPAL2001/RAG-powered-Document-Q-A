from fastapi import FastAPI, Depends, HTTPException, status, Form, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timedelta
import os

# Import our custom modules
from database import connect_to_mongo, close_mongo_connection, get_db
from models import UserCreate, Token
import auth
import rag
import uuid
from typing import Optional
from fastapi import UploadFile, File, Form

app = FastAPI(title="RAG Q&A Backend")

# Setup CORS to allow our React frontend to communicate with this FastAPI backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5177"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# Lifecycle Events
# ---------------------------------------------------------
@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

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
        "hashed_password": hashed_password
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
    
    # 2. If user doesn't exist or password doesn't match the hashed one, throw error
    if not user or not auth.verify_password(form_data.password, user["hashed_password"]):
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
        "email": current_user["email"],
        "name": current_user["name"]
    }

# ---------------------------------------------------------
# RAG Endpoints (Phase 3)
# ---------------------------------------------------------

@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...), 
    current_user: dict = Depends(auth.get_current_user),
    db=Depends(get_db)
):
    """
    Protected route to upload a PDF.
    Only logged-in users can upload files.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    user_id = current_user["email"]
    doc_id = str(uuid.uuid4())
    
    # Process the PDF using our RAG pipeline
    result = await rag.process_pdf(file, user_id, doc_id)
    
    # Track document in MongoDB
    doc_record = {
        "user_email": user_id,
        "doc_id": doc_id,
        "filename": file.filename,
        "created_at": datetime.utcnow()
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
    db=Depends(get_db)
):
    """
    Protected route to ask a question.
    It retrieves context from ChromaDB and gets an answer from Groq.
    """
    user_id = current_user["email"]
    
    # Get the answer from the RAG pipeline
    result = rag.answer_question(question, user_id, doc_id, history)
    answer = result["answer"]
    sources = result["sources"]
    
    # Save the chat history to MongoDB
    chat_log = {
        "user_email": user_id,
        "doc_id": doc_id,
        "question": question,
        "answer": answer,
        "sources": sources
    }
    await db["chat_history"].insert_one(chat_log)
    
    return {"question": question, "answer": answer, "sources": sources}


@app.get("/documents")
async def get_documents(
    current_user: dict = Depends(auth.get_current_user),
    db=Depends(get_db)
):
    """Fetch all documents uploaded by the user."""
    user_id = current_user["email"]
    cursor = db["documents"].find({"user_email": user_id}).sort("created_at", -1)
    documents = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])  # convert ObjectId to string
        documents.append(doc)
    return documents


@app.get("/chat_history/{doc_id}")
async def get_chat_history(
    doc_id: str,
    current_user: dict = Depends(auth.get_current_user),
    db=Depends(get_db)
):
    """Fetch all past chats for a specific document."""
    user_id = current_user["email"]
    cursor = db["chat_history"].find({"user_email": user_id, "doc_id": doc_id})
    history = []
    async for chat in cursor:
        chat["_id"] = str(chat["_id"])
        history.append(chat)
    return history
