import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { User, Mail, Calendar, FileText, LogOut, Edit2, Loader2, ArrowLeft } from 'lucide-react';

interface UserProfileData { _id: string; name: string; email: string; created_at?: string; }

export default function UserProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });

  useEffect(() => {
    api.get('/users/me')
      .then(({ data }) => {
        setUser(data);
        if (data) setFormData({ name: data.name, email: data.email });
      })
      .catch(() => {
        localStorage.removeItem('token');
        navigate('/login');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.put('/users/me', formData);
      setUser(data);
      setFormData({ name: data.name, email: data.email });
      setEditing(false);
    } catch {
      alert('Failed to update profile.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  const joined = user?.created_at ? new Date(user.created_at).toLocaleDateString() : '';

  return (
    <>
      <style>{`
        @keyframes fadeSlide { from { opacity:0; transform:translateY(15px); } to { opacity:1; transform:translateY(0); } } .fade-slide { animation: fadeSlide 0.4s ease-out both; }
        @keyframes float-soft { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-3px);} } .float-soft { animation: float-soft 4s ease-in-out infinite; }
      `}</style>

      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition">
              <ArrowLeft size={18} /> Back
            </button>
            <h1 className="text-xl font-bold text-blue-700">Profile</h1>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"><LogOut size={18} /> Logout</button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="fade-slide mb-8 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">{user?.name || 'Welcome'}</h2>
          <p className="text-gray-500">Your profile overview</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { icon: User, label: 'Profile', value: 'Active', color: 'text-blue-600 bg-blue-50' },
            { icon: Mail, label: 'Email', value: user?.email || '', color: 'text-green-600 bg-green-50' },
            { icon: Calendar, label: 'Joined', value: joined, color: 'text-purple-600 bg-purple-50' },
            { icon: FileText, label: 'Status', value: 'Active', color: 'text-orange-600 bg-orange-50' }
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 float-soft">
              <div className={`flex items-center gap-2 mb-2`}><item.icon size={22} className={item.color} /> <span className={`font-medium ${item.color}`}>{item.label}</span></div>
              {item.value && <p className="text-sm text-gray-600 break-all">{item.value}</p>}
            </div>
          ))}
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl p-8 shadow-lg border border-blue-100 fade-slide">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">About</h3>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"><Edit2 size={18} /> Edit</button>
            ) : (
              <div className="space-y-4 w-full max-w-md">
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Full Name" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-700" />
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Email" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-700" />
                <div className="flex gap-3">
                  <button onClick={handleSave} className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium">Save</button>
                  <button onClick={() => setEditing(false)} className="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition">Cancel</button>
                </div>
              </div>
            )}
          </div>



          {/* Footer */}
          <footer className="mt-12 text-center text-gray-400 text-sm">
            <p>&copy; 2026 RAG App. All rights reserved.</p>
          </footer>
        </div>
      </div>
    </>
  );
}
