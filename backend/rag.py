import os
import shutil
from fastapi import UploadFile
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_groq import ChatGroq
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv

load_dotenv()

# Directory to permanently store uploaded PDFs
UPLOAD_DIR = "./saved_documents"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Directory where ChromaDB persists its vector data on disk
CHROMA_DB_DIR = "./chroma_db"

# ---------------------------------------------------------
# Step 1: Initialization (done once at module load - keeps latency low)
# ---------------------------------------------------------
# Local embedding model - converts text to vectors, runs on CPU, free
embeddings_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# Persistent ChromaDB vector store - shared across all users,
# isolation is handled via metadata filtering (user_id)
vector_store = Chroma(
    collection_name="rag_documents",
    embedding_function=embeddings_model,
    persist_directory=CHROMA_DB_DIR
)

# Groq LLM - llama-3.1-8b-instant is currently the fastest available model
llm = ChatGroq(
    model_name="llama-3.1-8b-instant",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0  # deterministic, fact-based answers for RAG
)

# ---------------------------------------------------------
# Step 2: Document Processing (Ingestion)
# ---------------------------------------------------------
async def process_pdf(file: UploadFile, user_id: str, doc_id: str):
    """
    Takes an uploaded PDF, extracts text, splits into chunks,
    embeds each chunk, and stores vectors in ChromaDB tagged
    with user_id and doc_id for later filtered retrieval.
    """
    # 1. Save the file temporarily
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # 2. Load the PDF - extracts raw text per page
        loader = PyPDFLoader(file_path)
        docs = loader.load()

        # 3. Split into smaller chunks for precise retrieval
        # Smaller chunks (800 chars) = more targeted matches for Q&A
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,
            chunk_overlap=150  # overlap prevents cutting sentences mid-thought
        )
        splits = text_splitter.split_documents(docs)

        # 4. Tag every chunk with user_id and doc_id
        # This is what allows per-user/per-document filtering later
        for chunk in splits:
            chunk.metadata["user_id"] = user_id
            chunk.metadata["doc_id"] = doc_id
            chunk.metadata["source"] = file.filename

        # 5. Embed and store in ChromaDB (auto-persisted)
        vector_store.add_documents(splits)

        return {
            "message": f"Successfully processed {len(splits)} chunks from {file.filename}",
            "chunks": len(splits)
        }
    except Exception as e:
        # If processing fails, clean up the file and re-raise
        if os.path.exists(file_path):
            os.remove(file_path)
        raise e



# ---------------------------------------------------------
# Step 3: Question Answering (Retrieval & Generation)
# ---------------------------------------------------------
# Prompt template - includes BOTH context and question (bug fix),
# and instructs the model to stay grounded in the provided text
RAG_PROMPT = ChatPromptTemplate.from_template(
    "You are a helpful assistant answering questions about a document.\n"
    "Use ONLY the following context to answer the question. "
    "If the answer is not contained in the context, say "
    "\"I don't have enough information in the document to answer that.\"\n"
    "Keep your answer concise and to the point.\n\n"
    "Chat History:\n{history}\n\n"
    "Context:\n{context}\n\n"
    "Question: {question}\n\n"
    "Answer:"
)

# Similarity score threshold (lower = more similar for Chroma's L2 distance).
# Tune this based on testing - if no chunks pass, we skip the LLM call entirely.
SIMILARITY_THRESHOLD = 200


def format_docs(docs):
    """Combine retrieved chunks into a single context string, with sources."""
    return "\n\n".join(
        f"[Source: {doc.metadata.get('source', 'unknown')}, "
        f"Page {doc.metadata.get('page', '?')}]\n{doc.page_content}"
        for doc in docs
    )


def contextualize_question(question: str, history: str) -> str:
    """
    Rewrites a follow-up question into a standalone question using chat history.
    This ensures that vector similarity search finds the correct documents even if 
    the user just asks 'what about the projects?' or 'only 2?'.
    """
    if not history.strip():
        return question
    
    rewrite_prompt = ChatPromptTemplate.from_template(
        "Given this conversation history:\n{history}\n\n"
        "Rewrite the following follow-up question as a standalone question "
        "that includes necessary context. If it's already standalone, return it as-is.\n"
        "Follow-up: {question}\n\n"
        "Standalone question:"
    )
    
    chain = rewrite_prompt | llm | StrOutputParser()
    return chain.invoke({"history": history, "question": question})

def answer_question(question: str, user_id: str, doc_id: str | None = None, history: str = ""):
    """
    Retrieves relevant chunks for this user (optionally scoped to one document)
    and asks Groq's LLM to answer based only on that context.
    Includes recent chat history for context.

    Returns a dict with the answer and the source chunks used (for citations).
    """
    # 1. Build the metadata filter - always scoped to the user for isolation,
    # optionally narrowed to a single document
    filter_dict = {"user_id": user_id}
    if doc_id:
        filter_dict = {"$and": [{"user_id": user_id}, {"doc_id": doc_id}]}

    # 2. Rewrite the question using chat history so it's a standalone query
    standalone_query = contextualize_question(question, history)

    # 3. Similarity search WITH scores using the rewritten standalone query
    results = vector_store.similarity_search_with_score(
        standalone_query, k=5, filter=filter_dict
    )

    # 3. Drop low-relevance chunks (reduces hallucination on off-topic questions)
    relevant_docs = [doc for doc, score in results if score < SIMILARITY_THRESHOLD]

    if not relevant_docs:
        return {
            "answer": "I couldn't find relevant information in your document(s) to answer that.",
            "sources": []
        }

    # 4. Build context string from the relevant chunks only
    context = format_docs(relevant_docs)

    # 6. Run the LLM chain (no retriever needed here - we already have docs)
    chain = RAG_PROMPT | llm | StrOutputParser()
    answer = chain.invoke({"context": context, "question": question, "history": history})

    # 6. Return answer + source metadata for citations in the UI
    sources = [
        {
            "source": doc.metadata.get("source", "unknown"),
            "page": doc.metadata.get("page", None),
            "snippet": doc.page_content[:200]
        }
        for doc in relevant_docs
    ]

    return {"answer": answer, "sources": sources}


# ---------------------------------------------------------
# Step 4 (optional): Delete a document's vectors
# ---------------------------------------------------------
def delete_document(user_id: str, doc_id: str):
    """Remove all chunks belonging to a specific document for a user."""
    vector_store._collection.delete(
        where={"$and": [{"user_id": user_id}, {"doc_id": doc_id}]}
    )
    return {"message": "Document vectors deleted"}