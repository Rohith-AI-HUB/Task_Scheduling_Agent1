import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, Award, AlertCircle, CheckCircle, Clock, Target, Lightbulb, Heart } from 'lucide-react';
import axios from 'axios';

function GradingDashboard() {
  const [pendingGrades, setPendingGrades] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [finalGrade, setFinalGrade] = useState('');
  const [teacherComments, setTeacherComments] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchPendingGrades();
    fetchGradingHistory();
  }, []);

  const fetchPendingGrades = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/grading/pending', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingGrades(response.data.submissions);
    } catch (error) {
      console.error('Error fetching pending grades:', error);
    }
  };

  const fetchGradingHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/grading/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(response.data.history);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const analyzeSubmission = async (taskId, studentId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:8000/api/grading/analyze-submission',
        { task_id: taskId, student_id: studentId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAiAnalysis(response.data);
      setSelectedSubmission({ taskId, studentId, suggestionId: response.data.suggestion_id });
      setFinalGrade(response.data.suggested_grade.toString());
    } catch (error) {
      console.error('Error analyzing submission:', error);
      alert(error.response?.data?.detail || 'Error analyzing submission');
    } finally {
      setLoading(false);
    }
  };

  const finalizeGrade = async () => {
    if (!selectedSubmission || !finalGrade || !teacherComments) {
      alert('Please provide a grade and comments');
      return;
    }

    const gradeNum = parseFloat(finalGrade);
    if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 100) {
      alert('Grade must be between 0 and 100');
      return;
    }

    const gradeDiff = Math.abs(gradeNum - aiAnalysis.suggested_grade);
    if (gradeDiff > 10 && !overrideReason) {
      alert('Please provide a reason for significantly different grade');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:8000/api/grading/${selectedSubmission.suggestionId}/finalize`,
        {
          final_grade: gradeNum,
          teacher_comments: teacherComments,
          override_reason: gradeDiff > 5 ? overrideReason : null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Grade finalized and student notified!');

      // Reset state
      setAiAnalysis(null);
      setSelectedSubmission(null);
      setFinalGrade('');
      setTeacherComments('');
      setOverrideReason('');

      // Refresh lists
      fetchPendingGrades();
      fetchGradingHistory();
    } catch (error) {
      console.error('Error finalizing grade:', error);
      alert(error.response?.data?.detail || 'Error finalizing grade');
    }
  };

  const cancelGrading = () => {
    setAiAnalysis(null);
    setSelectedSubmission(null);
    setFinalGrade('');
    setTeacherComments('');
    setOverrideReason('');
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Brain className="text-purple-600" size={40} />
          AI Grading Assistant
        </h1>
        <p className="text-gray-600">Intelligent grading powered by AI analysis</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <Award className="text-blue-600" size={32} />
              <div>
                <div className="text-3xl font-bold text-blue-900">{stats.total_graded}</div>
                <div className="text-sm text-blue-700">Total Graded</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-green-600" size={32} />
              <div>
                <div className="text-3xl font-bold text-green-900">{stats.agreement_rate}%</div>
                <div className="text-sm text-green-700">AI Agreement</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <Clock className="text-orange-600" size={32} />
              <div>
                <div className="text-3xl font-bold text-orange-900">{pendingGrades.length}</div>
                <div className="text-sm text-orange-700">Pending Grades</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Pending Submissions or AI Analysis */}
        <div>
          {!aiAnalysis ? (
            // Pending Submissions List
            <>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Target size={24} />
                Pending Submissions ({pendingGrades.length})
              </h2>

              {pendingGrades.length === 0 ? (
                <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                  <CheckCircle className="mx-auto mb-4 text-green-500" size={64} />
                  <h3 className="text-xl font-semibold mb-2">All Caught Up!</h3>
                  <p className="text-gray-600">No pending submissions to grade at the moment.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {pendingGrades.map(submission => (
                    <div
                      key={submission.id}
                      className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-4 cursor-pointer border-l-4 border-purple-500"
                      onClick={() => analyzeSubmission(submission.task_id, submission.student_id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{submission.task_title}</h3>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <span className="font-medium">{submission.student_name}</span>
                          </p>

                          <div className="flex gap-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock size={14} />
                              {submission.estimated_hours}h estimated
                            </span>
                            <span className="flex items-center gap-1">
                              <AlertCircle size={14} />
                              Complexity: {submission.complexity}/10
                            </span>
                          </div>
                        </div>

                        <button className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2">
                          <Brain size={16} />
                          Analyze
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            // AI Analysis Results
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Brain className="text-purple-600" size={28} />
                  AI Analysis
                </h2>
                <button
                  onClick={cancelGrading}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  ← Back to List
                </button>
              </div>

              {loading ? (
                <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">AI is analyzing the submission...</p>
                </div>
              ) : (
                <>
                  {/* Suggested Grade */}
                  <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border-2 border-purple-300">
                    <div className="text-center mb-4">
                      <div className="text-sm text-gray-600 mb-1">AI Suggested Grade</div>
                      <div className="text-6xl font-bold text-purple-600">
                        {aiAnalysis.suggested_grade}
                        <span className="text-3xl text-gray-500">/100</span>
                      </div>
                    </div>

                    <div className="bg-white bg-opacity-70 rounded-lg p-4">
                      <p className="text-sm text-gray-700">{aiAnalysis.reasoning}</p>
                    </div>
                  </div>

                  {/* Performance Summary */}
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-bold mb-3 flex items-center gap-2">
                      <TrendingUp size={20} />
                      Performance Summary
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Time Efficiency:</span>
                        <span className="ml-2 font-semibold">{aiAnalysis.performance_summary.time_efficiency}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">On Time:</span>
                        <span className="ml-2 font-semibold">
                          {aiAnalysis.performance_summary.on_time ? '✅ Yes' : '❌ Late'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Completion:</span>
                        <span className="ml-2 font-semibold">{aiAnalysis.performance_summary.completion_rate}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Extensions:</span>
                        <span className="ml-2 font-semibold">{aiAnalysis.performance_summary.extensions}</span>
                      </div>
                    </div>
                  </div>

                  {/* Strengths */}
                  {aiAnalysis.strengths && aiAnalysis.strengths.length > 0 && (
                    <div className="bg-green-50 rounded-xl p-6">
                      <h3 className="font-bold mb-3 flex items-center gap-2 text-green-800">
                        <Award size={20} />
                        Strengths
                      </h3>
                      <ul className="space-y-2">
                        {aiAnalysis.strengths.map((strength, idx) => (
                          <li key={idx} className="text-sm text-green-700 flex items-start gap-2">
                            <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Weaknesses */}
                  {aiAnalysis.weaknesses && aiAnalysis.weaknesses.length > 0 && (
                    <div className="bg-orange-50 rounded-xl p-6">
                      <h3 className="font-bold mb-3 flex items-center gap-2 text-orange-800">
                        <AlertCircle size={20} />
                        Areas for Improvement
                      </h3>
                      <ul className="space-y-2">
                        {aiAnalysis.weaknesses.map((weakness, idx) => (
                          <li key={idx} className="text-sm text-orange-700 flex items-start gap-2">
                            <span className="text-orange-500 mt-0.5">•</span>
                            <span>{weakness}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Improvement Suggestions */}
                  {aiAnalysis.improvements && aiAnalysis.improvements.length > 0 && (
                    <div className="bg-blue-50 rounded-xl p-6">
                      <h3 className="font-bold mb-3 flex items-center gap-2 text-blue-800">
                        <Lightbulb size={20} />
                        Suggestions for Future
                      </h3>
                      <ul className="space-y-2">
                        {aiAnalysis.improvements.map((improvement, idx) => (
                          <li key={idx} className="text-sm text-blue-700 flex items-start gap-2">
                            <span className="text-blue-500 mt-0.5">→</span>
                            <span>{improvement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Encouragement */}
                  {aiAnalysis.encouragement && (
                    <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-6 border-l-4 border-pink-500">
                      <div className="flex items-start gap-3">
                        <Heart className="text-pink-500 flex-shrink-0" size={24} />
                        <p className="text-sm font-medium text-gray-700">{aiAnalysis.encouragement}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: Finalize Grade Form or History */}
        <div>
          {aiAnalysis && !loading ? (
            // Grade Finalization Form
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
              <h2 className="text-2xl font-bold mb-6">Finalize Grade</h2>

              {/* Grade Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Final Grade (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={finalGrade}
                  onChange={(e) => setFinalGrade(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg font-bold focus:border-purple-500 focus:outline-none"
                  placeholder="Enter grade"
                />
                {Math.abs(parseFloat(finalGrade) - aiAnalysis.suggested_grade) > 5 && (
                  <p className="text-sm text-orange-600 mt-1">
                    ⚠️ Different from AI suggestion ({aiAnalysis.suggested_grade})
                  </p>
                )}
              </div>

              {/* Teacher Comments */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Teacher Feedback</label>
                <textarea
                  value={teacherComments}
                  onChange={(e) => setTeacherComments(e.target.value)}
                  rows="4"
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
                  placeholder="Provide constructive feedback for the student..."
                />
              </div>

              {/* Override Reason (if significantly different) */}
              {Math.abs(parseFloat(finalGrade) - aiAnalysis.suggested_grade) > 10 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2 text-orange-700">
                    Override Reason (Required)
                  </label>
                  <textarea
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    rows="2"
                    className="w-full border-2 border-orange-300 rounded-lg px-4 py-2 focus:border-orange-500 focus:outline-none"
                    placeholder="Why does your grade differ significantly from AI suggestion?"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={finalizeGrade}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  Finalize & Notify Student
                </button>
                <button
                  onClick={cancelGrading}
                  className="px-6 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            // Grading History
            <div>
              <h2 className="text-2xl font-bold mb-4">Recent Grades</h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {history.slice(0, 10).map(item => (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg shadow p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{item.task_title}</h3>
                        <p className="text-sm text-gray-600">{item.student_name}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-purple-600">{item.final_grade}</div>
                        <div className="text-xs text-gray-500">
                          AI: {item.ai_suggested_grade}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      {item.ai_agreement ? (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                          ✓ AI Agreement
                        </span>
                      ) : (
                        <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs">
                          Override ({Math.abs(item.grade_difference).toFixed(1)} pts)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GradingDashboard;
