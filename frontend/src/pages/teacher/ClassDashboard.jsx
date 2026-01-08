import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, TrendingDown, AlertTriangle, Award, CheckCircle, XCircle, Activity } from 'lucide-react';
import axios from 'axios';
import HomeButton from '../../components/HomeButton';

function ClassDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState('overview'); // 'overview', 'at-risk', 'top-performers', 'all-students'

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/class/analytics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskScore) => {
    if (riskScore >= 6) return 'text-red-600 bg-red-50 border-red-200';
    if (riskScore >= 4) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  };

  const getCompletionColor = (rate) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeColor = (grade) => {
    if (grade >= 90) return 'text-green-600';
    if (grade >= 80) return 'text-blue-600';
    if (grade >= 70) return 'text-yellow-600';
    if (grade >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading class analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Users className="mx-auto mb-4 text-gray-400" size={64} />
          <h3 className="text-xl font-semibold mb-2">No Data Available</h3>
          <p className="text-gray-600">Create some tasks and assign them to students to see analytics.</p>
        </div>
      </div>
    );
  }

  const { class_metrics, grade_distribution, at_risk_students, top_performers, struggle_areas, all_students } = analytics;

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Users className="text-blue-600" size={40} />
              Class Performance Dashboard
            </h1>
            <p className="text-gray-600">Comprehensive overview of your class performance</p>
          </div>
          <HomeButton />
        </div>
      </div>

      {/* Class Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-blue-700 mb-1">Total Students</div>
              <div className="text-4xl font-bold text-blue-900">{class_metrics.total_students}</div>
            </div>
            <Users className="text-blue-600" size={48} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-green-700 mb-1">Completion Rate</div>
              <div className="text-4xl font-bold text-green-900">{class_metrics.class_completion_rate}%</div>
            </div>
            <CheckCircle className="text-green-600" size={48} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-purple-700 mb-1">Class Average</div>
              <div className="text-4xl font-bold text-purple-900">
                {class_metrics.class_average_grade ? `${class_metrics.class_average_grade}%` : 'N/A'}
              </div>
            </div>
            <Award className="text-purple-600" size={48} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-red-700 mb-1">At-Risk Students</div>
              <div className="text-4xl font-bold text-red-900">{class_metrics.at_risk_count}</div>
            </div>
            <AlertTriangle className="text-red-600" size={48} />
          </div>
        </div>
      </div>

      {/* View Selector */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSelectedView('overview')}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            selectedView === 'overview'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setSelectedView('at-risk')}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            selectedView === 'at-risk'
              ? 'bg-red-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          At-Risk ({at_risk_students.length})
        </button>
        <button
          onClick={() => setSelectedView('top-performers')}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            selectedView === 'top-performers'
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Top Performers ({top_performers.length})
        </button>
        <button
          onClick={() => setSelectedView('all-students')}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            selectedView === 'all-students'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All Students ({all_students.length})
        </button>
      </div>

      {/* Overview View */}
      {selectedView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Grade Distribution */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Activity size={24} />
              Grade Distribution
            </h3>
            <div className="space-y-3">
              {Object.entries(grade_distribution).map(([grade, count]) => (
                <div key={grade}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{grade}</span>
                    <span className="text-gray-600">{count} students</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        grade.startsWith('A') ? 'bg-green-500' :
                        grade.startsWith('B') ? 'bg-blue-500' :
                        grade.startsWith('C') ? 'bg-yellow-500' :
                        grade.startsWith('D') ? 'bg-orange-500' :
                        grade.startsWith('F') ? 'bg-red-500' :
                        'bg-gray-400'
                      }`}
                      style={{ width: `${(count / class_metrics.total_students * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Struggle Areas */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="text-orange-600" size={24} />
              Common Struggle Areas
            </h3>
            {struggle_areas.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No struggling tasks identified!</p>
            ) : (
              <div className="space-y-4">
                {struggle_areas.map((area, idx) => (
                  <div key={idx} className="border-l-4 border-orange-500 bg-orange-50 p-4 rounded">
                    <div className="font-semibold mb-1">{area.task_title}</div>
                    <div className="flex justify-between text-sm">
                      <span className="text-orange-700">
                        {area.students_struggling} students struggling
                      </span>
                      <span className="text-orange-900 font-bold">
                        {area.completion_rate}% completion
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* At-Risk Students View */}
      {selectedView === 'at-risk' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="text-red-600" size={24} />
            At-Risk Students
          </h3>
          {at_risk_students.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="mx-auto mb-4 text-green-500" size={64} />
              <h3 className="text-xl font-semibold mb-2">Great News!</h3>
              <p className="text-gray-600">No students are currently at risk.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {at_risk_students.map(student => (
                <div
                  key={student.student_id}
                  className={`border-2 rounded-lg p-4 ${getRiskColor(student.risk_score)}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-lg">{student.student_name}</h4>
                      <p className="text-sm opacity-75">{student.email}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">Risk: {student.risk_score}</div>
                      <div className="text-xs">out of 10</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                    <div>
                      <div className="opacity-75">Completion</div>
                      <div className="font-bold">{student.completion_rate}%</div>
                    </div>
                    <div>
                      <div className="opacity-75">Avg Grade</div>
                      <div className="font-bold">
                        {student.average_grade ? `${student.average_grade}%` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="opacity-75">Overdue</div>
                      <div className="font-bold">{student.overdue_tasks}</div>
                    </div>
                    <div>
                      <div className="opacity-75">Stress</div>
                      <div className="font-bold">{student.stress_level}/10</div>
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold mb-1">Risk Factors:</div>
                    <ul className="list-disc list-inside text-sm">
                      {student.risk_factors.map((factor, idx) => (
                        <li key={idx}>{factor}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Top Performers View */}
      {selectedView === 'top-performers' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Award className="text-green-600" size={24} />
            Top Performers
          </h3>
          {top_performers.length === 0 ? (
            <p className="text-center text-gray-600 py-12">No top performers identified yet.</p>
          ) : (
            <div className="space-y-4">
              {top_performers.map((student, idx) => (
                <div key={student.student_id} className="border-2 border-green-200 bg-green-50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl font-bold text-green-600">#{idx + 1}</div>
                      <div>
                        <h4 className="font-bold text-lg">{student.student_name}</h4>
                        <p className="text-sm text-gray-600">{student.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-green-700">
                        {student.average_grade}%
                      </div>
                      <div className="text-sm text-green-600">Average Grade</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Completion Rate</div>
                      <div className="font-bold text-green-700">{student.completion_rate}%</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Tasks Completed</div>
                      <div className="font-bold">{student.completed_tasks}/{student.total_tasks}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Extensions</div>
                      <div className="font-bold">{student.extension_requests}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Students View */}
      {selectedView === 'all-students' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4">All Students</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2">
                  <th className="text-left p-3">Student</th>
                  <th className="text-center p-3">Tasks</th>
                  <th className="text-center p-3">Completion</th>
                  <th className="text-center p-3">Avg Grade</th>
                  <th className="text-center p-3">Overdue</th>
                  <th className="text-center p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {all_students.map(student => (
                  <tr key={student.student_id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-semibold">{student.student_name}</div>
                      <div className="text-sm text-gray-600">{student.email}</div>
                    </td>
                    <td className="text-center p-3">
                      {student.completed_tasks}/{student.total_tasks}
                    </td>
                    <td className="text-center p-3">
                      <span className={`font-bold ${getCompletionColor(student.completion_rate)}`}>
                        {student.completion_rate}%
                      </span>
                    </td>
                    <td className="text-center p-3">
                      {student.average_grade ? (
                        <span className={`font-bold ${getGradeColor(student.average_grade)}`}>
                          {student.average_grade}%
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="text-center p-3">
                      {student.overdue_tasks > 0 ? (
                        <span className="text-red-600 font-bold">{student.overdue_tasks}</span>
                      ) : (
                        <span className="text-green-600">0</span>
                      )}
                    </td>
                    <td className="text-center p-3">
                      {student.is_at_risk ? (
                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold">
                          At Risk
                        </span>
                      ) : (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                          On Track
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClassDashboard;
