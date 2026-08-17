import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '../api';
import { Eye, EyeOff, Loader2, Mail, Lock, User, Sparkles, BrainCircuit } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegistering) {
        const { data } = await api.post('/register', formData);
        localStorage.setItem('token', data.access_token);
        navigate('/');
      } else {
        const formBody = new URLSearchParams();
        formBody.append('username', formData.email);
        formBody.append('password', formData.password);
        const { data } = await api.post('/login', formBody);
        localStorage.setItem('token', data.access_token);
        navigate('/');
      }
    } catch (err) {
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.detail
          : 'Something went wrong. Try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        /* Animated Mesh Gradient Background */
        .mesh-bg {
          background-color: #0f172a;
          background-image: 
            radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%), 
            radial-gradient(at 50% 0%, hsla(225,39%,30%,0.2) 0, transparent 50%), 
            radial-gradient(at 100% 0%, hsla(339,49%,30%,0.2) 0, transparent 50%);
          animation: mesh-pulse 15s ease-in-out infinite alternate;
        }

        @keyframes mesh-pulse {
          0% { background-position: 0% 0%; }
          50% { background-position: 100% 100%; }
          100% { background-position: 0% 0%; }
        }

        /* Glassmorphism */
        .premium-glass {
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        /* Input styling */
        .cyber-input {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          transition: all 0.3s ease;
        }
        
        .cyber-input:focus {
          background: rgba(0, 0, 0, 0.4);
          border-color: #818cf8;
          box-shadow: 0 0 0 2px rgba(129, 140, 248, 0.2);
        }

        .cyber-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        /* Button Glow */
        .glow-btn {
          position: relative;
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          z-index: 1;
          overflow: hidden;
        }
        
        .glow-btn::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%);
          opacity: 0;
          z-index: -1;
          transition: opacity 0.3s ease;
        }
        
        .glow-btn:hover::before {
          opacity: 1;
        }

        /* Animations */
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-enter {
          animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Floating orbs */
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.4;
          animation: float 10s infinite ease-in-out alternate;
        }
        
        @keyframes float {
          0% { transform: translate(0, 0); }
          100% { transform: translate(30px, -30px); }
        }
      `}</style>

      <div className="min-h-screen w-full flex items-center justify-center p-4 mesh-bg relative overflow-hidden">
        
        {/* Background Orbs */}
        <div className="orb bg-indigo-600 w-96 h-96 top-[-10%] left-[-10%]"></div>
        <div className="orb bg-purple-600 w-96 h-96 bottom-[-10%] right-[-10%]" style={{ animationDelay: '-5s' }}></div>

        {/* Main Card */}
        <div 
          className={`premium-glass w-full max-w-md rounded-3xl p-8 relative z-10 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 mb-6">
              <BrainCircuit className="w-8 h-8 text-indigo-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
              DocuMind <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">AI</span>
            </h1>
            <p className="text-gray-400 text-sm">
              {isRegistering ? 'Unlock the power of intelligent document analysis.' : 'Welcome back to your AI workspace.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-xl px-4 py-3 animate-enter">
              <p className="text-red-400 text-sm font-medium text-center">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {isRegistering && (
              <div className="animate-enter" style={{ animationDelay: '0.1s' }}>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    name="name"
                    type="text"
                    required
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={handleChange}
                    className="cyber-input w-full rounded-xl pl-11 pr-4 py-3.5 text-sm outline-none"
                  />
                </div>
              </div>
            )}

            <div className="animate-enter" style={{ animationDelay: '0.2s' }}>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={handleChange}
                  className="cyber-input w-full rounded-xl pl-11 pr-4 py-3.5 text-sm outline-none"
                />
              </div>
            </div>

            <div className="animate-enter" style={{ animationDelay: '0.3s' }}>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  className="cyber-input w-full rounded-xl pl-11 pr-12 py-3.5 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="pt-4 animate-enter" style={{ animationDelay: '0.4s' }}>
              <button
                type="submit"
                disabled={loading}
                className="glow-btn w-full rounded-xl py-3.5 px-4 text-white font-semibold text-sm shadow-lg transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  <>
                    {isRegistering ? 'Create Account' : 'Sign In'}
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 flex items-center justify-between animate-enter" style={{ animationDelay: '0.5s' }}>
            <div className="h-px bg-white/10 flex-1"></div>
            <span className="px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">or continue with</span>
            <div className="h-px bg-white/10 flex-1"></div>
          </div>

          <button
            type="button"
            onClick={() => { window.location.href = `${import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'}/auth/google`; }}
            className="mt-6 w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3.5 px-4 text-white text-sm font-medium transition-all animate-enter"
            style={{ animationDelay: '0.6s' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/>
              <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
            </svg>
            Google
          </button>

          <div className="mt-8 text-center animate-enter" style={{ animationDelay: '0.7s' }}>
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}