import { Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useStore';

/**
 * HomeButton Component
 *
 * Navigates to appropriate dashboard based on user role
 */
export default function HomeButton() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleHomeClick = () => {
    // Navigate to appropriate dashboard based on role
    if (user?.role === 'teacher') {
      navigate('/teacher/class');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <button
      onClick={handleHomeClick}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg"
      title="Go to Home"
    >
      <Home size={20} />
      <span className="font-medium">Home</span>
    </button>
  );
}
