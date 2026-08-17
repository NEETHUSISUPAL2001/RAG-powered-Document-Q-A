import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// Handles the redirect back from the backend after a successful Google login.
// The backend appends ?token=<jwt> to this URL; we store it and go to the dashboard.
export default function GoogleAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('token', token);
    }
    // Clean the URL so the token isn't left in the browser history
    navigate('/', { replace: true });
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
      <Loader2 className="animate-spin text-blue-600 h-8 w-8" />
      <p className="text-gray-500 text-sm">Signing you in...</p>
    </div>
  );
}
