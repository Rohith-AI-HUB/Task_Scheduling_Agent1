import { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, AlertCircle, CheckCircle, XCircle, Calendar, FileText, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '../components/NotificationBell';

export default function ExtensionsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState({
    task_id: '',
    requested_deadline: '',
    reason: '',
    reason_category: 'other'
  });

  useEffect(() => {
    loadRequests();
    loadTasks();
  }, []);

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const loadRequests = async () => {
    try {
      const res = await axios.get('http://localhost:8000/extensions', getAuthHeader());
      setRequests(res.data);
    } catch (err) {
      console.error('Failed to load extension requests:', err);
      setError('Failed to load extension requests. Please refresh the page.');
    }
  };

  const loadTasks = async () => {
    try {
      const res = await axios.get('http://localhost:8000/tasks', getAuthHeader());
      setTasks(res.data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  };

  const parseErrorMessage = (error) => {
    console.log('Full error object:', error);
    console.log('Response data:', error.response?.data);

    // Handle network errors
    if (!error.response) {
      return error.message || 'Network error. Please check your connection.';
    }

    const { data, status } = error.response;

    // Handle 401 Unauthorized
    if (status === 401) {
      return 'Session expired. Please log in again.';
    }

    // Handle 403 Forbidden
    if (status === 403) {
      return 'You do not have permission to perform this action.';
    }

    // Handle 404 Not Found
    if (status === 404) {
      return 'Resource not found.';
    }

    // Handle 422 Validation Error (FastAPI)
    if (status === 422) {
      // FastAPI validation errors come as an array in detail
      if (Array.isArray(data?.detail)) {
        const errors = data.detail.map(err => {
          const field = err.loc ? err.loc.slice(-1)[0] : 'unknown';
          const message = err.msg || 'Invalid value';
          return `${field}: ${message}`;
        }).join('; ');
        return `Validation Error: ${errors}`;
      }
      
      // Single validation error
      if (typeof data?.detail === 'string') {
        return `Validation Error: ${data.detail}`;
      }

      return 'Validation error. Please check your input.';
    }

    // Handle 500 Server Error
    if (status >= 500) {
      return 'Server error. Please try again later.';
    }

    // Handle string error messages
    if (typeof data?.detail === 'string') {
      return data.detail;
    }

    // Handle object error messages
    if (typeof data?.detail === 'object' && data.detail !== null) {
      return JSON.stringify(data.detail);
    }

    // Handle plain string response
    if (typeof data === 'string') {
      return data;
    }

    // Fallback
    return 'An unexpected error occurred. Please try again.';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Validate form data before submission
      if (!formData.task_id || !formData.requested_deadline || !formData.reason) {
        setError('Please fill in all required fields.');
        setLoading(false);
        return;
      }

      // Ensure deadline is a valid date and in ISO format
      const requestedDate = new Date(formData.requested_deadline);
      if (isNaN(requestedDate.getTime())) {
        setError('Invalid date selected.');
        setLoading(false);
        return;
      }

      // Prepare the payload
      const payload = {
        task_id: formData.task_id, // Keep as string for MongoDB ObjectId
        requested_deadline: requestedDate.toISOString(),
        reason: formData.reason.trim(),
        reason_category: formData.reason_category
      };

      console.log('Submitting payload:', payload);

      const response = await axios.post(
        'http://localhost:8000/extensions/', 
        payload,
        getAuthHeader()
      );

      console.log('Response:', response.data);

      // Success - reset form and show success message
      setFormData({
        task_id: '',
        requested_deadline: '',
        reason: '',
        reason_category: 'other'
      });
      setShowForm(false);
      setSuccessMessage('Extension request submitted successfully! AI analysis is complete.');
      
      // Reload requests to show the new one
      await loadRequests();

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);

    } catch (err) {
      const errorMessage = parseErrorMessage(err);
      setError(errorMessage);
      console.error('Extension request error:', err);
      console.error('Error response:', err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Approved' },
      denied: { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'Denied' }
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${badge.color}`}>
        <Icon size={14} />
        {badge.text}
      </span>
    );
  };

  const getRecommendationBadge = (recommendation) => {
    const colors = {
      approve: 'bg-green-50 border-green-200 text-green-700',
      deny: 'bg-red-50 border-red-200 text-red-700',
      conditional: 'bg-blue-50 border-blue-200 text-blue-700'
    };

    return colors[recommendation] || colors.conditional;
  };

  const getCategoryLabel = (category) => {
    const labels = {
      medical: 'Medical',
      technical: 'Technical Issues',
      overlapping: 'Overlapping Deadlines',
      personal: 'Personal',
      other: 'Other'
    };
    return labels[category] || category;
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  const formatLocalDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              title="Back to Dashboard"
            >
              <Home size={24} className="text-gray-700" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Extension Requests</h1>
              <p className="text-gray-600 mt-1">Request deadline extensions with AI-powered analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <button
              onClick={() => {
                setShowForm(!showForm);
                setError('');
                setSuccessMessage('');
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Calendar size={20} />
              {showForm ? 'Cancel' : 'Request Extension'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-start gap-2">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError('')}
              className="text-red-700 hover:text-red-900"
            >
              <XCircle size={20} />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex items-start gap-2">
            <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Success</p>
              <p className="text-sm">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage('')}
              className="text-green-700 hover:text-green-900"
            >
              <XCircle size={20} />
            </button>
          </div>
        )}

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">New Extension Request</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Task <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.task_id}
                  onChange={(e) => setFormData({ ...formData, task_id: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading}
                >
                  <option value="">Choose a task...</option>
                  {tasks.map(task => (
                    <option key={task.id} value={task.id}>
                      {task.title} - Due: {formatLocalDate(task.deadline)}
                    </option>
                  ))}
                </select>
                {tasks.length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">No tasks available. Please create a task first.</p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Requested New Deadline <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.requested_deadline}
                  onChange={(e) => setFormData({ ...formData, requested_deadline: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.reason_category}
                  onChange={(e) => setFormData({ ...formData, reason_category: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading}
                >
                  <option value="medical">Medical</option>
                  <option value="technical">Technical Issues</option>
                  <option value="overlapping">Overlapping Deadlines</option>
                  <option value="personal">Personal</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Detailed Explanation <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Provide a detailed explanation for your extension request..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="4"
                  required
                  disabled={loading}
                  minLength={10}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 10 characters required ({formData.reason.length}/10)
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || tasks.length === 0}
                className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Submitting (AI analyzing)...' : 'Submit Request (AI will analyze)'}
              </button>
            </form>
          </div>
        )}

        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="bg-white p-12 rounded-lg shadow text-center">
              <FileText size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No Extension Requests</h3>
              <p className="text-gray-500">You haven't submitted any extension requests yet.</p>
            </div>
          ) : (
            requests.map(req => (
              <div key={req.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg">Task ID: {req.task_id}</h3>
                      {getStatusBadge(req.status)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="bg-gray-100 px-2 py-1 rounded">
                        {getCategoryLabel(req.reason_category)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Original Deadline</p>
                    <p className="font-semibold">{formatDate(req.original_deadline)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Requested Deadline</p>
                    <p className="font-semibold text-blue-600">{formatDate(req.requested_deadline)}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">Your Reason:</p>
                  <p className="text-gray-800 bg-gray-50 p-3 rounded">{req.reason}</p>
                </div>

                {req.ai_recommendation && (
                  <div className={`border-2 rounded-lg p-4 mb-4 ${getRecommendationBadge(req.ai_recommendation)}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle size={18} />
                      <span className="font-semibold">AI Recommendation: {req.ai_recommendation.toUpperCase()}</span>
                    </div>
                    <p className="text-sm italic mb-2">{req.ai_reasoning}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span>Confidence Score:</span>
                      <div className="bg-white rounded-full h-2 flex-1 max-w-xs">
                        <div
                          className="bg-current h-2 rounded-full"
                          style={{ width: `${(req.ai_confidence_score * 100)}%` }}
                        />
                      </div>
                      <span className="font-semibold">{(req.ai_confidence_score * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                )}

                {req.review_comment && (
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <p className="text-sm text-blue-900 font-semibold mb-1">Teacher's Response:</p>
                    <p className="text-blue-800">{req.review_comment}</p>
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-4">
                  Submitted: {formatDate(req.created_at)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}