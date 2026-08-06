import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '../api';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

import loginGif from '../assets/Login@2x.gif';

// ── Generates an SVG path with circular cloud scallops on the right edge ──
// width = how far right the panel goes
// scallops = number of cloud puffs
function cloudPath(width: number, scallops: number): string {
  const totalH = 1000; // viewBox height
  const r = totalH / scallops / 2; // radius of each scallop circle
  let d = `M 0 0 L ${width} 0 `;
  for (let i = 0; i < scallops; i++) {
    // sweep-flag=1 makes the arc bulge to the RIGHT (outward)
    d += `A ${r} ${r} 0 0 1 ${width} ${(i + 1) * r * 2} `;
  }
  d += `L 0 1000 Z`;
  return d;
}

export default function Login() {
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

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
        html, body, #root { height: 100%; margin: 0; padding: 0; }

        /*
         * Each layer independently oscillates its path's width
         * by animating the SVG 'd' attribute between two shapes.
         * This creates the fluid, breathing cloud effect.
         */
        @keyframes cloud-breathe-1 {
          0%, 100% { d: path("${cloudPath(370, 8)}"); }
          50%       { d: path("${cloudPath(395, 8)}"); }
        }
        @keyframes cloud-breathe-2 {
          0%, 100% { d: path("${cloudPath(340, 8)}"); }
          50%       { d: path("${cloudPath(365, 8)}"); }
        }
        @keyframes cloud-breathe-3 {
          0%, 100% { d: path("${cloudPath(310, 8)}"); }
          50%       { d: path("${cloudPath(335, 8)}"); }
        }
        @keyframes cloud-breathe-4 {
          0%, 100% { d: path("${cloudPath(280, 8)}"); }
          50%       { d: path("${cloudPath(305, 8)}"); }
        }

        .cloud-layer-1 { animation: cloud-breathe-1 4s ease-in-out infinite; }
        .cloud-layer-2 { animation: cloud-breathe-2 4.4s ease-in-out 0.4s infinite; }
        .cloud-layer-3 { animation: cloud-breathe-3 4.8s ease-in-out 0.8s infinite; }
        .cloud-layer-4 { animation: cloud-breathe-4 5.2s ease-in-out 1.2s infinite; }

        .gif-blend { mix-blend-mode: multiply; }

        /* Gentle floating motion for the animated GIF */
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-9px); }
        }
        .float-anim { animation: float 5s ease-in-out infinite; }

        /* Soft fade + slide up when the form loads */
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fade-up 0.7s ease-out both; }
      `}</style>

      <div className="min-h-screen w-full flex overflow-hidden bg-white">

        {/* ════════════════════════════════════════
            LEFT PANEL — solid blue + cloud SVG overlay
        ════════════════════════════════════════ */}
        <div className="relative shrink-0" style={{ width: '42%' }}>

          {/* Solid background fill behind all layers */}
          <div className="absolute inset-0 bg-[#1565C0]" />

          {/* ── 4 Cloud Scallop Layers as animated SVG paths ── */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 500 1000"
            preserveAspectRatio="none"
            style={{ overflow: 'visible' }}
          >
            {/* Layer 4 — lightest, renders first (bottom of stack) */}
            <path
              className="cloud-layer-4"
              d={cloudPath(280, 8)}
              fill="#BBDEFB"
            />
            {/* Layer 3 */}
            <path
              className="cloud-layer-3"
              d={cloudPath(310, 8)}
              fill="#64B5F6"
            />
            {/* Layer 2 */}
            <path
              className="cloud-layer-2"
              d={cloudPath(340, 8)}
              fill="#1E88E5"
            />
            {/* Layer 1 — deepest blue, widest, renders on top */}
            <path
              className="cloud-layer-1"
              d={cloudPath(370, 8)}
              fill="#1565C0"
            />
          </svg>

          {/* ── Left panel content (above the SVG layers) ── */}
          <div className="relative z-10 h-full flex flex-col items-center justify-between py-10 px-10">
            <p className="self-start text-white text-sm font-light tracking-wide bg-white/10 border border-white/20 rounded-full px-4 py-1.5 backdrop-blur-sm">Welcome to</p>

            {/* GIF / Illustration */}
            <div className="relative flex flex-col items-center">
              {/* Floating animated GIF shown as-is */}
              <div className="float-anim mb-7">
                <img src={loginGif} alt="DocuMind AI" className="w-96 h-96 object-contain gif-blend drop-shadow-2xl" />
              </div>

              <h2 className="text-white text-2xl font-bold tracking-tight">DocuMind AI</h2>
              <p className="text-blue-200 text-xs text-center mt-2 leading-relaxed max-w-[200px]">
                Your AI assistant for<br />seamless document Q&A.
              </p>
            </div>

            <div className="flex items-center gap-3 text-blue-200 text-[10px] font-bold tracking-widest uppercase">
              <span>NEETHU</span>
              <span className="w-px h-3 bg-blue-300 opacity-60" />
              <span>RAG PROJECT</span>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            RIGHT PANEL — Auth Form
        ════════════════════════════════════════ */}
        <div className="flex-1 flex items-center justify-center px-12 bg-white">
          <div className="w-full max-w-md fade-up">

            <h1 className="text-2xl font-bold text-gray-800 mb-7">
              {isRegistering ? 'Create your account' : 'Welcome back 👋'}
            </h1>

            {error && (
              <div className="mb-5 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {isRegistering && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Name</label>
                  <input
                    name="name"
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full border-b-2 border-gray-200 focus:border-blue-600 bg-transparent text-sm
                               text-gray-700 py-2 outline-none placeholder-gray-400 transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">E-mail Address</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="Enter your mail"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full border-b-2 border-gray-200 focus:border-blue-600 bg-transparent text-sm
                             text-gray-700 py-2 outline-none placeholder-gray-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full border-b-2 border-gray-200 focus:border-blue-600 bg-transparent text-sm
                               text-gray-700 py-2 outline-none placeholder-gray-400 transition-colors pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-2 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {isRegistering && (
                <div className="flex items-start gap-3 pt-1">
                  <input type="checkbox" id="terms" required className="mt-0.5 w-4 h-4 accent-blue-600 cursor-pointer" />
                  <label htmlFor="terms" className="text-xs text-gray-500 leading-relaxed cursor-pointer">
                    By Signing Up, I Agree with{' '}
                    <span className="font-bold text-blue-600 hover:underline cursor-pointer">Terms &amp; Conditions</span>
                  </label>
                </div>
              )}

              <div className="flex items-center gap-4 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  onClick={() => setIsRegistering(true)}
                  className="px-8 py-2.5 bg-blue-700 hover:bg-blue-800 active:scale-95 text-white text-sm font-semibold
                             rounded-full shadow-md shadow-blue-200 transition-all disabled:opacity-60 flex items-center gap-2"
                >
                  {loading && isRegistering && <Loader2 className="animate-spin h-4 w-4" />}
                  Sign Up
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  onClick={() => setIsRegistering(false)}
                  className="px-8 py-2.5 border-2 border-blue-700 text-blue-700 hover:bg-blue-50 active:scale-95 text-sm
                             font-semibold rounded-full transition-all disabled:opacity-60 flex items-center gap-2"
                >
                  {loading && !isRegistering && <Loader2 className="animate-spin h-4 w-4" />}
                  Sign In
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
