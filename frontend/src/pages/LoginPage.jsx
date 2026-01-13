import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/useStore';
import AuthLayout from '../components/auth/AuthLayout';
import AuthFormCard from '../components/auth/AuthFormCard';
import FloatingLabelInput from '../components/ui/Input/FloatingLabelInput';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login: setAuthState } = useAuthStore();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Login and get user data
      const userData = await authService.login(email, password);
      const token = localStorage.getItem('token');

      // Update Zustand store
      setAuthState(userData, token);

      // Role-based routing
      if (userData?.role === 'teacher') {
        navigate('/teacher/dashboard'); // Navigate to teacher dashboard
      } else {
        navigate('/dashboard'); // Navigate to student dashboard
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthFormCard
        title="Welcome Back"
        subtitle="Sign in to your account"
        footerText="Don't have an account?"
        footerLinkText="Create Account"
        onFooterLinkClick={() => navigate('/register')}
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <FloatingLabelInput
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <FloatingLabelInput
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center cursor-pointer group">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-[#7C3AED] focus:ring-[#7C3AED] focus:ring-offset-0"
              />
              <span className="ml-2 text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                Remember me
              </span>
            </label>

            <a
              href="#"
              className="text-[#6B7280] hover:text-[#7C3AED] dark:text-gray-400 dark:hover:text-purple-400 transition-colors"
              onClick={(e) => e.preventDefault()}
            >
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-[#7C3AED] to-[#9333EA] hover:from-[#6D28D9] hover:to-[#7E22CE] text-white font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </AuthFormCard>
    </AuthLayout>
  );
}
