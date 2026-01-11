import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/useStore';
import AuthLayout from '../components/auth/AuthLayout';
import AuthFormCard from '../components/auth/AuthFormCard';
import FloatingLabelInput from '../components/ui/Input/FloatingLabelInput';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '', password: '', fullName: '', role: 'student', usn: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login: setAuthState } = useAuthStore();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Register and get user data
      const userData = await authService.register(
        formData.email,
        formData.password,
        formData.fullName,
        formData.role,
        formData.usn || undefined
      );
      const token = localStorage.getItem('token');

      // Update Zustand store
      setAuthState(userData, token);

      // Role-based routing
      if (userData?.role === 'teacher') {
        navigate('/teacher/class');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthFormCard
        title="Create Account"
        subtitle="Join us today"
        footerText="Already have an account?"
        footerLinkText="Sign In"
        onFooterLinkClick={() => navigate('/login')}
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          <FloatingLabelInput
            type="text"
            label="Full Name"
            value={formData.fullName}
            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
            required
          />

          <FloatingLabelInput
            type="email"
            label="Email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
          />

          <FloatingLabelInput
            type="password"
            label="Password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required
            minLength={6}
          />

          <FloatingLabelInput
            type="select"
            label="I am a..."
            value={formData.role}
            onChange={(e) => setFormData({...formData, role: e.target.value})}
            options={[
              { value: 'student', label: 'Student' },
              { value: 'teacher', label: 'Teacher' }
            ]}
          />

          <div>
            <FloatingLabelInput
              type="text"
              label="USN (Optional)"
              value={formData.usn}
              onChange={(e) => setFormData({...formData, usn: e.target.value})}
              placeholder="e.g., 1ms25scs032 or 1ms25scs032-t"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-1">
              University Serial Number for group coordination
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-[#7C3AED] to-[#9333EA] hover:from-[#6D28D9] hover:to-[#7E22CE] text-white font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
      </AuthFormCard>
    </AuthLayout>
  );
}
