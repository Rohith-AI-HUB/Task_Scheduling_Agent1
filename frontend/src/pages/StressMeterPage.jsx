import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, AlertCircle, CheckCircle, Clock, Target } from 'lucide-react';
import axios from 'axios';
import { Line } from 'recharts';

function StressMeterPage() {
  const [stressData, setStressData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjectiveScore, setSubjectiveScore] = useState(5);
  const [notes, setNotes] = useState('');
  const [showFeelingModal, setShowFeelingModal] = useState(false);

  useEffect(() => {
    fetchStressData();
    fetchHistory();
  }, []);

  const fetchStressData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/stress/current', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStressData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stress data:', error);
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/stress/history?days=7', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(response.data.history);
    } catch (error) {
      console.error('Error fetching stress history:', error);
    }
  };

  const submitFeeling = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:8000/api/stress/log-feeling',
        {
          subjective_score: subjectiveScore,
          notes: notes
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setShowFeelingModal(false);
      setNotes('');
      fetchStressData();
      fetchHistory();
    } catch (error) {
      console.error('Error logging feeling:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Brain className="animate-pulse mx-auto mb-4 text-purple-500" size={48} />
          <p className="text-gray-600">Analyzing your stress level...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Stress Meter</h1>
        <p className="text-gray-600">AI-powered workload stress analysis and recommendations</p>
      </div>

      {/* Main Stress Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Stress Score Card */}
        <div className="lg:col-span-2 bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Current Stress Level</h2>
            <Brain className="text-purple-500" size={32} />
          </div>

          {/* Stress Meter Visualization */}
          <div className="text-center mb-8">
            <div className="relative inline-block">
              <div className={`text-8xl font-bold ${getStressColor(stressData?.objective_score)}`}>
                {stressData?.objective_score?.toFixed(1) || '0.0'}
              </div>
              <div className="text-2xl text-gray-500 mt-2">/10</div>
            </div>

            <div className="mt-4">
              <div className="text-4xl mb-2">{stressData?.emoji}</div>
              <div className={`text-xl font-semibold ${getStressColor(stressData?.objective_score)}`}>
                {stressData?.level?.toUpperCase()}
              </div>
              <p className="text-gray-600 mt-2">{stressData?.message}</p>
            </div>
          </div>

          {/* Stress Breakdown */}
          <div className="bg-white rounded-lg p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Target size={18} />
              Stress Factors Breakdown
            </h3>

            <div className="space-y-3">
              {Object.entries(stressData?.breakdown || {}).map(([key, value]) => (
                <div key={key}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm font-semibold">{value?.toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getBarColor(value)}`}
                      style={{ width: `${(value / 4) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-100 p-2 rounded-lg">
                <CheckCircle className="text-blue-600" size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold">{stressData?.active_tasks_count || 0}</div>
                <div className="text-sm text-gray-600">Active Tasks</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-orange-100 p-2 rounded-lg">
                <Clock className="text-orange-600" size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold">{stressData?.urgent_tasks_count || 0}</div>
                <div className="text-sm text-gray-600">Urgent Tasks</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-purple-100 p-2 rounded-lg">
                <TrendingUp className="text-purple-600" size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold">{stressData?.deadlines_this_week || 0}</div>
                <div className="text-sm text-gray-600">Deadlines This Week</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowFeelingModal(true)}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            How Do You Feel?
          </button>
        </div>
      </div>

      {/* AI Recommendations */}
      {stressData?.recommendations && stressData.recommendations.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Brain className="text-purple-500" size={24} />
            AI Recommendations
          </h3>

          <div className="space-y-3">
            {stressData.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                <div className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                  {index + 1}
                </div>
                <p className="text-gray-700">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stress History Chart */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={24} />
            7-Day Stress Trend
          </h3>

          <div className="h-64">
            <StressHistoryChart history={history} />
          </div>
        </div>
      )}

      {/* How Do You Feel Modal */}
      {showFeelingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold mb-4">How Are You Feeling?</h3>
            <p className="text-gray-600 mb-6">
              Tell us your subjective stress level. This helps us better understand your workload.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-3">
                Stress Level: {subjectiveScore}/10
              </label>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={subjectiveScore}
                onChange={(e) => setSubjectiveScore(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>😊 Relaxed</span>
                <span>😐 Moderate</span>
                <span>🔥 Critical</span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows="3"
                placeholder="How are you feeling? Any specific concerns?"
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={submitFeeling}
                className="flex-1 bg-purple-500 text-white py-3 rounded-lg font-semibold hover:bg-purple-600"
              >
                Submit
              </button>
              <button
                onClick={() => {
                  setShowFeelingModal(false);
                  setNotes('');
                }}
                className="px-6 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StressHistoryChart({ history }) {
  // Simple visualization using divs (you can replace with recharts if needed)
  const maxScore = Math.max(...history.map(h => h.objective_score || h.subjective_score || 0), 10);

  return (
    <div className="flex items-end justify-between h-full gap-2">
      {history.slice(-7).map((entry, index) => {
        const score = entry.objective_score || entry.subjective_score || 0;
        const height = (score / maxScore) * 100;
        const date = new Date(entry.timestamp);

        return (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div className="w-full flex items-end justify-center h-48">
              <div
                className={`w-full rounded-t-lg ${getBarColor(score)}`}
                style={{ height: `${height}%` }}
                title={`${score.toFixed(1)}/10`}
              />
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {date.getMonth() + 1}/{date.getDate()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getStressColor(score) {
  if (score <= 3) return 'text-green-500';
  if (score <= 6) return 'text-yellow-500';
  if (score <= 8) return 'text-orange-500';
  return 'text-red-500';
}

function getBarColor(value) {
  if (value <= 3) return 'bg-green-500';
  if (value <= 6) return 'bg-yellow-500';
  if (value <= 8) return 'bg-orange-500';
  return 'bg-red-500';
}

export default StressMeterPage;
