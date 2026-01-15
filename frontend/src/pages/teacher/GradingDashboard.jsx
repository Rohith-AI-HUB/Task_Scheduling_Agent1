import React, { useState, useEffect } from 'react';
import {
  ClipboardList, Search, Filter, User, FileText, Calendar,
  CheckCircle, Clock, AlertCircle, X, Download, MessageSquare,
  LogOut, LayoutDashboard, ChevronDown, Paperclip, StickyNote,
  Eye, Send
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useStore';
import { authService } from '../../services/auth.service';
import { gradingService } from '../../services/grading.service';

function GradingDashboard() {
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();

  // State
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDetails, setTaskDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  // Feedback form
  const [feedbackText, setFeedbackText] = useState('');
  const [gradeValue, setGradeValue] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchStats();
  }, [statusFilter, subjectFilter]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await gradingService.getAssignedTasks({
        status: statusFilter || undefined,
        subject: subjectFilter || undefined,
        search: searchQuery || undefined
      });
      setTasks(data.tasks || []);
      setSubjects(data.subjects || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await gradingService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTasks();
  };

  const openTaskDetails = async (task) => {
    setSelectedTask(task);
    setDetailsLoading(true);
    setFeedbackText(task.teacher_feedback || '');
    setGradeValue(task.grade !== null && task.grade !== undefined ? task.grade.toString() : '');

    try {
      const details = await gradingService.getTaskDetails(task.id);
      setTaskDetails(details);
    } catch (error) {
      console.error('Error fetching task details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeTaskDetails = () => {
    setSelectedTask(null);
    setTaskDetails(null);
    setFeedbackText('');
    setGradeValue('');
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim()) {
      alert('Please enter feedback');
      return;
    }

    const grade = gradeValue ? parseFloat(gradeValue) : null;
    if (gradeValue && (isNaN(grade) || grade < 0 || grade > 100)) {
      alert('Grade must be between 0 and 100');
      return;
    }

    setSubmittingFeedback(true);
    try {
      await gradingService.addFeedback(selectedTask.id, {
        feedback: feedbackText,
        grade: grade
      });

      alert('Feedback submitted successfully!');

      // Update local state
      setTasks(tasks.map(t =>
        t.id === selectedTask.id
          ? { ...t, teacher_feedback: feedbackText, grade: grade }
          : t
      ));

      // Close modal
      closeTaskDetails();
      fetchStats();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert(error.response?.data?.detail || 'Error submitting feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      try {
        await authService.logout();
        logout();
        navigate('/login', { replace: true });
        window.location.reload();
      } catch (error) {
        console.error('Logout error:', error);
        logout();
        localStorage.clear();
        navigate('/login', { replace: true });
        window.location.reload();
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-300';
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'todo': return 'bg-gray-100 text-gray-700 border-gray-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle size={14} />;
      case 'in_progress': return <Clock size={14} />;
      case 'todo': return <AlertCircle size={14} />;
      default: return <AlertCircle size={14} />;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                <ClipboardList className="text-purple-600" size={40} />
                Task Review
              </h1>
              <p className="text-gray-600">Review student submissions and provide feedback</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/teacher/dashboard')}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                <LayoutDashboard size={20} />
                <span className="font-medium">Dashboard</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                <LogOut size={20} />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-purple-500">
              <div className="text-3xl font-bold text-purple-600">{stats.total_tasks}</div>
              <div className="text-sm text-gray-600">Total Tasks</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-green-500">
              <div className="text-3xl font-bold text-green-600">{stats.by_status?.completed || 0}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-blue-500">
              <div className="text-3xl font-bold text-blue-600">{stats.by_status?.in_progress || 0}</div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-orange-500">
              <div className="text-3xl font-bold text-orange-600">{stats.pending_review || 0}</div>
              <div className="text-sm text-gray-600">Pending Review</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by student name or USN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                />
              </div>
            </form>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white cursor-pointer"
              >
                <option value="">All Status</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>

            {/* Subject Filter */}
            <div className="relative">
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white cursor-pointer"
              >
                <option value="">All Subjects</option>
                {subjects.map((subject, idx) => (
                  <option key={idx} value={subject}>{subject}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          </div>
        </div>

        {/* Task List */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardList className="mx-auto mb-4 text-gray-300" size={64} />
              <h3 className="text-xl font-semibold mb-2 text-gray-700">No Tasks Found</h3>
              <p className="text-gray-500">No tasks match your current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Student</th>
                    <th className="px-4 py-3 text-left font-semibold">Task</th>
                    <th className="px-4 py-3 text-left font-semibold">Subject</th>
                    <th className="px-4 py-3 text-center font-semibold">Progress</th>
                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                    <th className="px-4 py-3 text-center font-semibold">Deadline</th>
                    <th className="px-4 py-3 text-center font-semibold">Attachments</th>
                    <th className="px-4 py-3 text-center font-semibold">Grade</th>
                    <th className="px-4 py-3 text-center font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task, idx) => (
                    <tr
                      key={task.id}
                      className={`border-b border-gray-100 hover:bg-purple-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <User size={16} className="text-purple-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">{task.student_name}</div>
                            <div className="text-xs text-gray-500">{task.student_usn}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800 max-w-[200px] truncate">{task.title}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{task.subject || '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{task.progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                          {getStatusIcon(task.status)}
                          {task.status === 'in_progress' ? 'In Progress' : task.status === 'completed' ? 'Completed' : 'To Do'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-gray-600">{formatDate(task.deadline)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {task.has_attachments && (
                            <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              <Paperclip size={12} />
                              {task.attachment_count}
                            </span>
                          )}
                          {task.has_notes && (
                            <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                              <StickyNote size={12} />
                              {task.note_count}
                            </span>
                          )}
                          {!task.has_attachments && !task.has_notes && (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {task.grade !== null && task.grade !== undefined ? (
                          <span className="font-bold text-purple-600">{task.grade}/100</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => openTaskDetails(task)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          <Eye size={14} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Task Details Modal */}
        {selectedTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">{selectedTask.title}</h2>
                    <p className="text-purple-100 text-sm">
                      Assigned to {selectedTask.student_name} ({selectedTask.student_usn})
                    </p>
                  </div>
                  <button
                    onClick={closeTaskDetails}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {detailsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                  </div>
                ) : taskDetails ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column - Task Info */}
                    <div className="space-y-6">
                      {/* Student Info */}
                      <div className="bg-purple-50 rounded-xl p-4">
                        <h3 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                          <User size={18} />
                          Student Information
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Name:</span>
                            <span className="font-medium">{taskDetails.student.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">USN:</span>
                            <span className="font-medium">{taskDetails.student.usn || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Email:</span>
                            <span className="font-medium">{taskDetails.student.email}</span>
                          </div>
                        </div>
                      </div>

                      {/* Task Details */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <FileText size={18} />
                          Task Details
                        </h3>
                        <div className="space-y-3 text-sm">
                          <div>
                            <span className="text-gray-600">Description:</span>
                            <p className="mt-1 text-gray-800">{taskDetails.task.description || 'No description'}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-gray-600">Subject:</span>
                              <p className="font-medium">{taskDetails.task.subject || '-'}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Priority:</span>
                              <p className="font-medium capitalize">{taskDetails.task.priority}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Deadline:</span>
                              <p className="font-medium">{formatDate(taskDetails.task.deadline)}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Status:</span>
                              <p className="font-medium capitalize">{taskDetails.task.status.replace('_', ' ')}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Subtasks */}
                      {taskDetails.subtasks && taskDetails.subtasks.length > 0 && (
                        <div className="bg-blue-50 rounded-xl p-4">
                          <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                            <CheckCircle size={18} />
                            Subtasks ({taskDetails.subtasks.filter(s => s.completed).length}/{taskDetails.subtasks.length})
                          </h3>
                          <ul className="space-y-2">
                            {taskDetails.subtasks.map((subtask, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <span className={`mt-0.5 ${subtask.completed ? 'text-green-600' : 'text-gray-400'}`}>
                                  {subtask.completed ? <CheckCircle size={16} /> : <Clock size={16} />}
                                </span>
                                <span className={subtask.completed ? 'line-through text-gray-500' : 'text-gray-800'}>
                                  {subtask.title}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Right Column - Attachments, Notes, Feedback */}
                    <div className="space-y-6">
                      {/* Attachments */}
                      <div className="bg-indigo-50 rounded-xl p-4">
                        <h3 className="font-semibold text-indigo-800 mb-3 flex items-center gap-2">
                          <Paperclip size={18} />
                          Attachments ({taskDetails.attachments?.length || 0})
                        </h3>
                        {taskDetails.attachments && taskDetails.attachments.length > 0 ? (
                          <ul className="space-y-2">
                            {taskDetails.attachments.map((att, idx) => (
                              <li key={idx} className="flex items-center justify-between bg-white rounded-lg p-3 shadow-sm">
                                <div className="flex items-center gap-2">
                                  <FileText size={16} className="text-indigo-600" />
                                  <div>
                                    <p className="text-sm font-medium text-gray-800">{att.filename}</p>
                                    <p className="text-xs text-gray-500">{formatFileSize(att.size)}</p>
                                  </div>
                                </div>
                                <a
                                  href={`http://localhost:8000${att.url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 hover:bg-indigo-100 rounded-lg transition-colors"
                                >
                                  <Download size={16} className="text-indigo-600" />
                                </a>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No attachments uploaded</p>
                        )}
                      </div>

                      {/* Notes */}
                      <div className="bg-amber-50 rounded-xl p-4">
                        <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                          <StickyNote size={18} />
                          Student Notes ({taskDetails.notes?.length || 0})
                        </h3>
                        {taskDetails.notes && taskDetails.notes.length > 0 ? (
                          <ul className="space-y-2 max-h-[200px] overflow-y-auto">
                            {taskDetails.notes.map((note, idx) => (
                              <li key={idx} className="bg-white rounded-lg p-3 shadow-sm">
                                <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
                                {note.created_at && (
                                  <p className="text-xs text-gray-500 mt-2">{formatDate(note.created_at)}</p>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No notes added</p>
                        )}
                      </div>

                      {/* Feedback Form */}
                      <div className="bg-green-50 rounded-xl p-4">
                        <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                          <MessageSquare size={18} />
                          Teacher Feedback
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Grade (0-100) - Optional
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={gradeValue}
                              onChange={(e) => setGradeValue(e.target.value)}
                              placeholder="Enter grade"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Feedback Comments
                            </label>
                            <textarea
                              value={feedbackText}
                              onChange={(e) => setFeedbackText(e.target.value)}
                              rows={4}
                              placeholder="Enter your feedback for the student..."
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none"
                            />
                          </div>
                          <button
                            onClick={submitFeedback}
                            disabled={submittingFeedback || !feedbackText.trim()}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors"
                          >
                            {submittingFeedback ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Submitting...
                              </>
                            ) : (
                              <>
                                <Send size={16} />
                                Submit Feedback
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-gray-500">Failed to load task details</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GradingDashboard;
