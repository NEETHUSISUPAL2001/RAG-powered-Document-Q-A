#  DocuMind AI — RAG-Powered Document Q&A

An intelligent document assistant powered by **Retrieval-Augmented Generation (RAG)**. Upload any PDF and ask questions about its content in natural language — DocuMind AI reads, understands, and answers instantly.

---

##  Features

-  **PDF Upload & Processing** — Upload PDFs (up to 15MB) and instantly query their content
- **AI-Powered Q&A** — Answers grounded in your document using Groq's LLM (Llama 3)
-  **Semantic Search** — ChromaDB vector store finds the most relevant sections
-  **Chat History** — Conversations are saved per-document and loaded on revisit
- **Authentication** — Email/password signup and Google OAuth login
-  **User Profiles** — Each user has isolated document storage and chat history
-  **Source Citations** — Every answer shows which document it came from
-  **Document Library** — Access all your previously uploaded documents from the sidebar

---

##  Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React + Vite + TypeScript + TailwindCSS |
| **Backend** | FastAPI (Python) |
| **LLM** | Groq API (Llama 3.1) |
| **Embeddings** | HuggingFace `all-MiniLM-L6-v2` (local, free) |
| **Vector Store** | ChromaDB (persistent, local) |
| **PDF Parsing** | pdfplumber (table-aware extraction) |
| **Database** | MongoDB (users, documents, chat history) |
| **Auth** | JWT + Google OAuth 2.0 |

---

##  Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB running locally (`sudo systemctl start mongod`)
- A [Groq API Key](https://console.groq.com/) (free)
- A [Google OAuth Client](https://console.cloud.google.com/apis/credentials) (for Google Sign-In)

---

### 1. Clone the repository

```bash
git clone https://github.com/NEETHUSISUPAL2001/RAG-powered-Document-Q-A.git
cd RAG-powered-Document-Q-A
```

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create your environment file
cp ../.env.example .env
# Now edit .env and fill in your real API keys
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

### 4. Configure Environment Variables

Copy `.env.example` to `backend/.env` and fill in the values:

```env
JWT_SECRET_KEY=your-strong-random-secret
MONGO_URI=mongodb://localhost:27017/documind_ai
GROQ_API_KEY=your-groq-api-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:8000/auth/google/callback
```

### 5. Run the Application

**Backend** (in one terminal):
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

**Frontend** (in another terminal):
```bash
cd frontend
npm run dev
```

Open your browser at **http://localhost:5173**

---

##  Project Structure

```
RAG-powered-Document-Q-A/
├── backend/
│   ├── main.py           # FastAPI app, routes, auth endpoints
│   ├── rag.py            # RAG pipeline (PDF ingestion + Q&A)
│   ├── google_auth.py    # Google OAuth flow
│   ├── requirements.txt
│   └── .env              # ← Your real secrets (never committed)
├── frontend/
│   └── src/
│       └── pages/
│           ├── Login.tsx      # Auth page (email + Google)
│           ├── Dashboard.tsx  # Main chat interface
│           └── UserProfile.tsx
├── .env.example          # Template — fill in and copy to backend/.env
├── .gitignore
└── README.md
```

---

##  Security Notes

- The `backend/.env` file containing real API keys is excluded from version control via `.gitignore`
- Never commit real credentials to GitHub
- For production, use environment variable injection via your hosting platform (Render, Railway, etc.)

---

##  Author

**Neethu Sisupal S D**  
M.Sc Artificial Intelligence | Taphubs Global  
[GitHub](https://github.com/NEETHUSISUPAL2001)
