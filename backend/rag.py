import os
import uuid
import asyncio
from datetime import datetime
from fastapi import UploadFile
from langchain_community.document_loaders import PDFPlumberLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_groq import ChatGroq
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv

load_dotenv()

UPLOAD_DIR = "./saved_documents"
os.makedirs(UPLOAD_DIR, exist_ok=True)

CHROMA_DB_DIR = os.getenv("CHROMA_PATH", "./chroma_db")

MAX_FILE_SIZE = 15 * 1024 * 1024

_state = {}


def _get_embeddings():
    if "embeddings" not in _state:
        _state["embeddings"] = FastEmbedEmbeddings(
            model_name="BAAI/bge-small-en-v1.5",
            batch_size=8
        )
    return _state["embeddings"]


def _get_vector_store():
    if "vector_store" not in _state:
        _state["vector_store"] = Chroma(
            collection_name="rag_documents",
            embedding_function=_get_embeddings(),
            persist_directory=CHROMA_DB_DIR,
        )
    return _state["vector_store"]


def _get_llm():
    if "llm" not in _state:
        _state["llm"] = ChatGroq(
            model_name=os.getenv("GROQ_MODEL_NAME", "llama-3.1-8b-instant"),
            api_key=os.getenv("GROQ_API_KEY"),
            temperature=0,
            reasoning_effort="low"

        )
    return _state["llm"]


async def process_pdf(file: UploadFile, user_id: str, doc_id: str):
    original_name = os.path.basename(file.filename or "document.pdf")
    if not original_name.lower().endswith(".pdf"):
        raise ValueError("Only PDF files are allowed")

    file_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4().hex}.pdf")
    size = 0
    with open(file_path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_FILE_SIZE:
                buffer.close()
                os.remove(file_path)
                raise ValueError("File too large (max 15 MB)")
            buffer.write(chunk)

    try:
        loader = PDFPlumberLoader(file_path)
        docs = await asyncio.to_thread(loader.load)

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,
            chunk_overlap=150,
        )
        splits = await asyncio.to_thread(text_splitter.split_documents, docs)

        for chunk in splits:
            chunk.metadata["user_id"] = user_id
            chunk.metadata["doc_id"] = doc_id
            chunk.metadata["source"] = original_name

        vs = _get_vector_store()
        await asyncio.to_thread(vs.add_documents, splits)

        return {
            "message": f"Successfully processed {len(splits)} chunks from {original_name}",
            "chunks": len(splits),
        }
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise e


RAG_PROMPT = ChatPromptTemplate.from_template(
    "You are a helpful assistant answering questions about a document.\n"
    "The current date is {current_date}. Use this to calculate time if 'Present' or 'Now' is mentioned in the context.\n"
    "Use ONLY the following context to answer the question. "
    "If the answer is not contained in the context, say "
    "\"I don't have enough information in the document to answer that.\"\n"
    "Keep your answer concise and to the point.\n"
    "IMPORTANT: Do NOT use markdown formatting like **bold** or *italics*. Format your response as clean, plain text only.\n\n"
    "Chat History:\n{history}\n\n"
    "Context:\n{context}\n\n"
    "Question: {question}\n\n"
    "Answer:"
)

SIMILARITY_THRESHOLD = 200


def format_docs(docs):
    return "\n\n".join(
        f"[Source: {doc.metadata.get('source', 'unknown')}, "
        f"Page {doc.metadata.get('page', '?')}]\n{doc.page_content}"
        for doc in docs
    )


def contextualize_question(question: str, history: str) -> str:
    if not history.strip() or "User:" not in history or "Assistant:" not in history:
        return question

    rewrite_prompt = ChatPromptTemplate.from_template(
        "Given this conversation history:\n{history}\n\n"
        "Rewrite the following follow-up question as a standalone question "
        "that includes necessary context. If it's already standalone, return it as-is.\n"
        "Follow-up: {question}\n\n"
        "Standalone question:"
    )

    chain = rewrite_prompt | _get_llm() | StrOutputParser()
    return chain.invoke({"history": history, "question": question})


def answer_question(question: str, user_id: str, doc_id: str | None = None, history: str = ""):
    filter_dict = {"user_id": user_id}
    if doc_id:
        filter_dict = {"$and": [{"user_id": user_id}, {"doc_id": doc_id}]}

    standalone_query = contextualize_question(question, history)

    vs = _get_vector_store()
    results = vs.similarity_search_with_score(
        standalone_query, k=5, filter=filter_dict
    )

    relevant_docs = [doc for doc, score in results if score < SIMILARITY_THRESHOLD]

    if not relevant_docs:
        return {
            "answer": "I couldn't find an answer in your document(s). If you are a new user, please make sure to upload a PDF (max 15MB) using the sidebar first so I can read it!",
            "sources": [],
        }

    context = format_docs(relevant_docs)

    chain = RAG_PROMPT | _get_llm() | StrOutputParser()
    answer = chain.invoke({"context": context, "question": question, "history": history, "current_date": datetime.now().strftime("%B %Y")})

    sources = [
        {
            "source": doc.metadata.get("source", "unknown"),
            "page": doc.metadata.get("page", None),
            "snippet": doc.page_content[:200],
        }
        for doc in relevant_docs
    ]

    return {"answer": answer, "sources": sources}


def delete_document(user_id: str, doc_id: str):
    vs = _get_vector_store()
    vs._collection.delete(
        where={"$and": [{"user_id": user_id}, {"doc_id": doc_id}]}
    )
    return {"message": "Document vectors deleted"}
