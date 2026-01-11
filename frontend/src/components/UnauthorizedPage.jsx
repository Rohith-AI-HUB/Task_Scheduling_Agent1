import { useNavigate } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';
import { useAuth } from '../store/useStore';

/**
 * UnauthorizedPage Component
 *
 * Displays a friendly error message when users try to access features
 * they don't have permission for. Shows role-specific available features.
 */
export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { isTeacher, isStudent } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <AlertTriangle className="mx-auto text-red-500 mb-4" size={64} />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-6">
          You don't have permission to access this feature.
        </p>

        <div className="bg-blue-50 p-4 rounded-lg mb-6 text-left">
          <h3 className="font-semibold text-blue-900 mb-2">
            {isTeacher ? 'Teacher Features:' : 'Student Features:'}
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            {isTeacher && (
              <>
                <li>• AI Grading Assistant</li>
                <li>• Class Dashboard & Analytics</li>
                <li>• Bulk Task Creator</li>
                <li>• Student Progress Tracking</li>
              </>
            )}
            {isStudent && (
              <>
                <li>• Stress Meter & Mental Health</li>
                <li>• Focus Mode</li>
                <li>• Smart Study Planner</li>
                <li>• Resource Library</li>
              </>
            )}
          </ul>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 justify-center w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          <Home size={20} />
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
