import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { UploadCloud, FileText, Send, User, Bot, LogOut, Loader2, Info, Folder, MessageSquare, Menu, X, UserCircle, BrainCircuit, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  sources?: Array<{ source: string; page: number; snippet: string }>;
}

interface ChatHistoryItem {
  _id: string;
  question: string;
  answer: string;
  sources: Array<{ source: string; page: number; snippet: string }>;
}

interface Document {
  _id: string;
  doc_id: string;
  filename: string;
  created_at: string;
}

interface SidebarContentProps {
  isUploading: boolean;
  onUploadClick: () => void;
  currentDocName: string | null;
  documents: Document[];
  currentDocId: string | null;
  onSelectDoc: (doc_id: string, filename: string) => void;
  user: { name: string; email: string };
  onLogout: () => void;
  onProfile: () => void;
}

function SidebarContent({ isUploading, onUploadClick, currentDocName, documents, currentDocId, onSelectDoc, user, onLogout, onProfile }: SidebarContentProps) {
  return (
    <>
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 mr-3 shadow-inner">
          <BrainCircuit className="w-5 h-5 text-indigo-400" />
        </div>
        <span className="font-bold text-xl tracking-tight text-white">
          DocuMind <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">AI</span>
        </span>
      </div>

      {/* Main Nav */}
      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">New Document</p>
          <button
            onClick={onUploadClick}
            disabled={isUploading}
            className="w-full flex items-center justify-center p-3.5 border border-dashed border-slate-700 rounded-xl hover:border-indigo-500 hover:bg-indigo-500/10 transition-all text-sm font-medium text-slate-300 disabled:opacity-50 group"
          >
            {isUploading ? <Loader2 className="animate-spin mr-2 h-5 w-5 text-indigo-400" /> : <UploadCloud className="mr-2 h-5 w-5 text-slate-400 group-hover:text-indigo-400 transition-colors" />}
            {isUploading ? 'Uploading...' : 'Upload PDF Document'}
          </button>
        </div>

        {currentDocName && (
          <div className="bg-indigo-500/10 text-indigo-300 p-3.5 rounded-xl text-sm flex items-start mb-6 border border-indigo-500/20 shadow-sm backdrop-blur-sm">
            <Info className="h-4 w-4 mr-2.5 mt-0.5 flex-shrink-0 text-indigo-400" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-indigo-400/80 mb-0.5 uppercase tracking-wider font-semibold">Active File</p>
              <p className="font-medium truncate">{currentDocName}</p>
            </div>
          </div>
        )}

        <div className="mt-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2 flex items-center">
            <Folder className="h-4 w-4 mr-1.5" />
            Your Library
          </p>
          <div className="space-y-1">
            {documents.length === 0 ? (
              <p className="text-xs text-slate-500 italic px-2 py-2">No documents uploaded yet.</p>
            ) : (
              documents.map(doc => (
                <button
                  key={doc._id}
                  onClick={() => onSelectDoc(doc.doc_id, doc.filename)}
                  className={`w-full flex items-center p-2.5 rounded-xl text-sm transition-all text-left ${
                    currentDocId === doc.doc_id
                      ? 'bg-slate-800 text-white shadow-sm border border-slate-700/50'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <MessageSquare className={`h-4 w-4 mr-3 flex-shrink-0 ${currentDocId === doc.doc_id ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span className="truncate flex-1">{doc.filename}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center mb-4 px-2">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full p-2 mr-3 shadow-md">
            <User size={16} className="text-white" />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-slate-200 truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onProfile}
            className="flex-1 flex items-center justify-center py-2 px-3 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <UserCircle className="mr-1.5 h-3.5 w-3.5" /> Profile
          </button>
          <button
            onClick={onLogout}
            className="flex-1 flex items-center justify-center py-2 px-3 border border-red-900/30 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/30 transition-colors"
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" /> Logout
          </button>
        </div>
      </div>
    </>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [input, setInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [currentDocName, setCurrentDocName] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch user profile on load
  useEffect(() => {
    const fetchUserAndDocs = async () => {
      try {
        const { data } = await api.get('/users/me');
        setUser(data);

        // Fetch documents
        const docsRes = await api.get('/documents');
        setDocuments(docsRes.data);
      } catch {
        localStorage.removeItem('token');
        navigate('/login');
      }
    };
    fetchUserAndDocs();
  }, [navigate]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleProfile = () => {
    navigate('/profile');
  };

  const loadDocumentChat = async (doc_id: string, filename: string) => {
    setCurrentDocId(doc_id);
    setCurrentDocName(filename);
    setMobileSidebarOpen(false);
    try {
      const { data } = await api.get(`/chat_history/${doc_id}`);
      const historyMessages: Message[] = [];
      data.forEach((chat: ChatHistoryItem) => {
        historyMessages.push({ id: chat._id + '_q', type: 'user', content: chat.question });
        historyMessages.push({ id: chat._id + '_a', type: 'bot', content: chat.answer, sources: chat.sources });
      });
      setMessages(historyMessages);
    } catch (err) {
      console.error("Failed to load chat history", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setCurrentDocId(data.doc_id);
      setCurrentDocName(file.name);

      setDocuments(prev => [{
        _id: data.doc_id,
        doc_id: data.doc_id,
        filename: file.name,
        created_at: new Date().toISOString()
      }, ...prev]);

      setMessages([{
        id: Date.now().toString(),
        type: 'bot',
        content: `I've successfully processed ${file.name}. What would you like to know about it?`
      }]);
    } catch {
      alert('Failed to upload document.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), type: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      const formData = new FormData();
      formData.append('question', userMsg);
      if (currentDocId) {
        formData.append('doc_id', currentDocId);
      }

      const recentMessages = messages.slice(-2);
      let historyStr = "";
      recentMessages.forEach(m => {
        historyStr += `${m.type === 'user' ? 'User' : 'Assistant'}: ${m.content}\n`;
      });
      formData.append('history', historyStr);

      const { data } = await api.post('/chat', formData);

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'bot',
        content: data.answer,
        sources: data.sources
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'bot',
        content: "Sorry, I encountered an error while trying to answer that."
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!user) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500 w-8 h-8" /></div>;

  const sidebarProps = {
    isUploading,
    onUploadClick: () => fileInputRef.current?.click(),
    currentDocName,
    documents,
    currentDocId,
    onSelectDoc: loadDocumentChat,
    user,
    onLogout: handleLogout,
    onProfile: handleProfile,
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans overflow-hidden">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: #475569; }
        
        .chat-scrollbar::-webkit-scrollbar { width: 6px; }
        .chat-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .chat-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 6px; border: 2px solid #f8fafc; }
        .chat-scrollbar:hover::-webkit-scrollbar-thumb { background: #94a3b8; }
      `}</style>
      
      <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf" onChange={handleFileUpload} />

      {/* Desktop Sidebar (Dark Theme) */}
      <div className="w-[280px] bg-slate-900 border-r border-slate-800 flex-col hidden md:flex shadow-2xl z-20">
        <SidebarContent {...sidebarProps} />
      </div>

      {/* Mobile Sidebar Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-slate-900 flex flex-col shadow-2xl transition-transform transform translate-x-0">
            <button onClick={() => setMobileSidebarOpen(false)} className="absolute top-6 right-4 text-slate-400 hover:text-white">
              <X size={20} />
            </button>
            <SidebarContent {...sidebarProps} />
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative w-full h-full">
        
        {/* Mobile Header */}
        <div className="md:hidden p-4 border-b border-slate-200 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center text-slate-800 font-bold">
            <Menu className="mr-3 cursor-pointer text-slate-600" onClick={() => setMobileSidebarOpen(true)} />
            <BrainCircuit className="w-5 h-5 text-indigo-500 mr-2" /> DocuMind
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="text-indigo-600 bg-indigo-50 p-2 rounded-lg">
            <UploadCloud size={18} />
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto chat-scrollbar p-4 sm:p-8 space-y-8 scroll-smooth pb-32">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 animate-in fade-in duration-700">
              <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <BrainCircuit size={40} className="text-indigo-300" />
              </div>
              <h2 className="text-2xl font-bold text-slate-700 mb-2">Welcome to DocuMind AI</h2>
              <p className="text-sm mt-2 text-center max-w-md text-slate-500 leading-relaxed">
                To get started, click <strong className="text-indigo-500">"Upload PDF Document"</strong> in the sidebar. Once uploaded, ask me any questions about the document's content!
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full space-y-8 pt-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
                  <div className={`flex max-w-[85%] ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    
                    {/* Avatar */}
                    <div className={`flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center shadow-sm ${
                      msg.type === 'user' 
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white ml-4' 
                        : 'bg-white border border-slate-200 text-indigo-600 mr-4'
                    }`}>
                      {msg.type === 'user' ? <User size={18} /> : <Bot size={20} />}
                    </div>
                    
                    {/* Bubble */}
                    <div className="flex flex-col">
                      <div className={`py-3.5 px-5 rounded-2xl shadow-sm ${
                        msg.type === 'user' 
                          ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-sm border border-indigo-500 shadow-indigo-200/50' 
                          : 'bg-white text-slate-700 rounded-tl-sm border border-slate-200'
                      }`}>
                        <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{msg.content}</p>
                      </div>

                      {/* Sources footnote */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2 pl-2">
                          <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                            <FileText size={12} className="text-slate-300" />
                            Source: {[...new Set(msg.sources.map(s => s.source))].join(', ')}
                          </p>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start animate-in fade-in duration-300">
                  <div className="flex flex-row max-w-[85%]">
                    <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-white border border-slate-200 text-indigo-400 mr-4 flex items-center justify-center shadow-sm">
                      <Bot size={20} />
                    </div>
                    <div className="py-4 px-5 rounded-2xl bg-white rounded-tl-sm border border-slate-200 shadow-sm flex items-center space-x-1.5 h-[52px]">
                      <div className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div className="h-32 sm:h-40" ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Floating Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-[#f8fafc] via-[#f8fafc] to-transparent pt-12">
          <div className="max-w-3xl mx-auto w-full relative">
            <form onSubmit={handleSendMessage} className="relative flex items-center shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-2xl bg-white border border-slate-200 transition-all focus-within:shadow-[0_8px_30px_rgb(99,102,241,0.15)] focus-within:border-indigo-300">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={documents.length === 0 ? "Step 1: Upload a PDF (max 15MB) in the sidebar..." : "Ask a question..."}
                className="w-full bg-transparent text-slate-800 text-[15px] rounded-2xl outline-none pl-6 pr-14 py-4 placeholder:text-slate-400"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="absolute right-2 p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all shadow-sm flex items-center justify-center"
              >
                <Send size={18} className="ml-0.5" />
              </button>
            </form>
            <div className="text-center mt-3">
              <span className="text-[11px] font-medium text-slate-400 flex items-center justify-center gap-1.5">
                <Sparkles size={12} className="text-indigo-400" />
                AI can make mistakes. Verify important information with the source text.
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
