import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { UploadCloud, FileText, Send, User, Bot, LogOut, Loader2, Info, Folder, MessageSquare, AlertCircle } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  sources?: Array<{ source: string; page: number; snippet: string }>;
}

interface Document {
  _id: string;
  doc_id: string;
  filename: string;
  created_at: string;
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
      } catch (err) {
        // If token is invalid or expired, go to login
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

  const loadDocumentChat = async (doc_id: string, filename: string) => {
    setCurrentDocId(doc_id);
    setCurrentDocName(filename);
    try {
      const { data } = await api.get(`/chat_history/${doc_id}`);
      const historyMessages: Message[] = [];
      data.forEach((chat: any) => {
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
      
      // Update documents list
      setDocuments(prev => [{
        _id: data.doc_id, // temporary _id until reload
        doc_id: data.doc_id,
        filename: file.name,
        created_at: new Date().toISOString()
      }, ...prev]);
      
      // Clear messages and add a system message to the chat
      setMessages([{
        id: Date.now().toString(),
        type: 'bot',
        content: `I've successfully read "${file.name}" (${data.chunks} chunks processed). What would you like to know about it?`
      }]);
    } catch (err) {
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
    
    // Add user message to UI
    setMessages(prev => [...prev, { id: Date.now().toString(), type: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      const formData = new FormData();
      formData.append('question', userMsg);
      if (currentDocId) {
        formData.append('doc_id', currentDocId);
      }
      
      // Combine last 2 messages for context so the bot remembers the topic
      const recentMessages = messages.slice(-2);
      let historyStr = "";
      recentMessages.forEach(m => {
        historyStr += `${m.type === 'user' ? 'User' : 'Assistant'}: ${m.content}\n`;
      });
      formData.append('history', historyStr);

      const { data } = await api.post('/chat', formData);
      
      // Add bot response to UI
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        type: 'bot', 
        content: data.answer,
        sources: data.sources 
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        type: 'bot', 
        content: "Sorry, I encountered an error while trying to answer that." 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col hidden md:flex">
        <div className="p-4 border-b border-gray-200 flex items-center text-blue-600 font-bold text-xl">
          <FileText className="mr-2" />
          DocuMind AI
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Upload Document</h3>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full flex items-center justify-center p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-sm font-medium text-gray-600 disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              {isUploading ? 'Uploading...' : 'Click to Upload PDF'}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="application/pdf"
              onChange={handleFileUpload}
            />
          </div>
          
          
          {currentDocName && (
            <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm flex items-start mb-4 border border-green-100">
              <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <p>Currently active: <span className="font-semibold">{currentDocName}</span></p>
            </div>
          )}
          
          <div className="mt-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center">
              <Folder className="h-4 w-4 mr-1" />
              Previous Documents
            </h3>
            <div className="space-y-1">
              {documents.length === 0 ? (
                <p className="text-xs text-gray-400 italic px-2 py-1">No documents uploaded yet.</p>
              ) : (
                documents.map(doc => (
                  <button
                    key={doc._id}
                    onClick={() => loadDocumentChat(doc.doc_id, doc.filename)}
                    className={`w-full flex items-center p-2 rounded-md text-sm transition-colors text-left ${
                      currentDocId === doc.doc_id 
                        ? 'bg-blue-100 text-blue-700 font-medium' 
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <MessageSquare className={`h-4 w-4 mr-2 flex-shrink-0 ${currentDocId === doc.doc_id ? 'text-blue-500' : 'text-gray-400'}`} />
                    <span className="truncate">{doc.filename}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center mb-3">
            <div className="bg-blue-100 text-blue-600 rounded-full p-2 mr-3">
              <User size={16} />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Mobile Header */}
        <div className="md:hidden p-4 border-b border-gray-200 flex justify-between items-center bg-white">
          <div className="flex items-center text-blue-600 font-bold">
            <FileText className="mr-2" /> DocuMind AI
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="text-blue-600">
            <UploadCloud />
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Bot size={48} className="mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-600">Welcome to DocuMind AI</p>
              <p className="text-sm mt-2 text-center max-w-md">Upload a PDF document using the sidebar to begin asking questions about it.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[85%] ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${msg.type === 'user' ? 'bg-blue-600 text-white ml-3' : 'bg-green-500 text-white mr-3'}`}>
                    {msg.type === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div>
                    <div className={`py-3 px-4 rounded-2xl ${msg.type === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                    </div>
                    
                    {/* Sources rendering */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.sources.map((source, idx) => (
                          <div key={idx} className="bg-gray-50 rounded-lg p-3 text-xs border border-gray-200">
                            <p className="text-blue-600 font-medium mb-1">{source.source}</p>
                            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap line-clamp-3">{source.snippet}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex flex-row max-w-[85%]">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-500 text-white mr-3 flex items-center justify-center">
                  <Bot size={16} />
                </div>
                <div className="py-4 px-5 rounded-2xl bg-gray-100 rounded-tl-none flex items-center space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-100">
          <form onSubmit={handleSendMessage} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your documents..."
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-full focus:ring-blue-500 focus:border-blue-500 block pl-5 pr-12 py-3.5 transition-all"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="absolute right-2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
            >
              <Send size={16} />
            </button>
          </form>
          <div className="text-center mt-2">
            <span className="text-[10px] text-gray-400">AI can make mistakes. Verify important information with the source text.</span>
          </div>
        </div>
      </div>
    </div>
  );
}