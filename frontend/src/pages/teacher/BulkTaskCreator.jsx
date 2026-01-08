import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Save, Send, FileText, CheckSquare, LogOut } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import HomeButton from '../../components/HomeButton';
import { useAuthStore } from '../../store/useStore';
import { authService } from '../../services/auth.service';

function BulkTaskCreator() {
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();
  const [students, setStudents] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState('medium');
  const [estimatedHours, setEstimatedHours] = useState(4);
  const [complexityScore, setComplexityScore] = useState(5);
  const [subtasks, setSubtasks] = useState(['']);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  useEffect(() => {
    fetchStudents();
    fetchTemplates();
  }, []);

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/bulk-tasks/students', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data.students);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/bulk-tasks/templates', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTemplates(response.data.templates);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const loadTemplate = async (templateId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:8000/api/bulk-tasks/templates/${templateId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const template = response.data;
      setTitle(template.title);
      setDescription(template.description);
      setEstimatedHours(template.estimated_hours);
      setComplexityScore(template.complexity_score);
      setSubtasks(template.subtasks.length > 0 ? template.subtasks : ['']);
    } catch (error) {
      console.error('Error loading template:', error);
    }
  };

  const toggleStudent = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    setSelectedStudents(students.map(s => s.id));
  };

  const deselectAllStudents = () => {
    setSelectedStudents([]);
  };

  const addSubtask = () => {
    setSubtasks([...subtasks, '']);
  };

  const updateSubtask = (index, value) => {
    const newSubtasks = [...subtasks];
    newSubtasks[index] = value;
    setSubtasks(newSubtasks);
  };

  const removeSubtask = (index) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedStudents.length === 0) {
      alert('Please select at least one student');
      return;
    }

    if (!title || !deadline) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');

      const filteredSubtasks = subtasks.filter(st => st.trim() !== '');

      const response = await axios.post(
        'http://localhost:8000/api/bulk-tasks/create',
        {
          title,
          description,
          deadline,
          priority,
          estimated_hours: estimatedHours,
          complexity_score: complexityScore,
          subtasks: filteredSubtasks,
          student_ids: selectedStudents,
          save_as_template: saveAsTemplate,
          template_name: saveAsTemplate ? templateName : null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(`Successfully created ${response.data.total_created} tasks!`);

      // Reset form
      setTitle('');
      setDescription('');
      setDeadline('');
      setPriority('medium');
      setEstimatedHours(4);
      setComplexityScore(5);
      setSubtasks(['']);
      setSelectedStudents([]);
      setSaveAsTemplate(false);
      setTemplateName('');

      // Refresh templates if saved
      if (saveAsTemplate) {
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error creating bulk tasks:', error);
      alert(error.response?.data?.detail || 'Error creating tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      try {
        // Call Firebase logout
        await authService.logout();

        // Clear Zustand store
        logout();

        // Navigate to login
        navigate('/login', { replace: true });

        // Force reload to clear any cached state
        window.location.reload();
      } catch (error) {
        console.error('Logout error:', error);
        // Force logout even if there's an error
        logout();
        localStorage.clear();
        navigate('/login', { replace: true });
        window.location.reload();
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Send className="text-green-600" size={40} />
              Bulk Task Creator
            </h1>
            <p className="text-gray-600">Welcome back, {user?.full_name || 'Teacher'}! 👋</p>
          </div>
          <div className="flex items-center gap-4">
            <HomeButton />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg"
              title="Logout"
            >
              <LogOut size={20} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Task Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 space-y-6">
            {/* Templates */}
            {templates.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">Load from Template</label>
                <select
                  onChange={(e) => e.target.value && loadTemplate(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Choose a template...</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name} (used {template.usage_count} times)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2">Task Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="e.g., Complete Chapter 5 Exercises"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="4"
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="Describe what students need to do..."
              />
            </div>

            {/* Deadline and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Deadline *</label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Estimated Hours and Complexity */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Estimated Hours</label>
                <input
                  type="number"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(parseFloat(e.target.value))}
                  min="0.5"
                  step="0.5"
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Complexity (1-10)</label>
                <input
                  type="number"
                  value={complexityScore}
                  onChange={(e) => setComplexityScore(parseInt(e.target.value))}
                  min="1"
                  max="10"
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Subtasks */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">Subtasks</label>
                <button
                  type="button"
                  onClick={addSubtask}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Plus size={16} /> Add Subtask
                </button>
              </div>

              <div className="space-y-2">
                {subtasks.map((subtask, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={subtask}
                      onChange={(e) => updateSubtask(index, e.target.value)}
                      className="flex-1 border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                      placeholder={`Subtask ${index + 1}`}
                    />
                    {subtasks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSubtask(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Save as Template */}
            <div className="border-t pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Save as template for future use</span>
              </label>

              {saveAsTemplate && (
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full mt-2 border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="Template name (e.g., Weekly Reading Assignment)"
                />
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || selectedStudents.length === 0}
              className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>Creating Tasks...</>
              ) : (
                <>
                  <Send size={20} />
                  Create Tasks for {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Student Selection */}
        <div>
          <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Users size={24} />
              Select Students
            </h3>

            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={selectAllStudents}
                className="flex-1 text-sm bg-blue-100 text-blue-700 py-2 rounded hover:bg-blue-200"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={deselectAllStudents}
                className="flex-1 text-sm bg-gray-100 text-gray-700 py-2 rounded hover:bg-gray-200"
              >
                Clear
              </button>
            </div>

            <div className="text-sm text-gray-600 mb-2">
              {selectedStudents.length} of {students.length} selected
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {students.map(student => (
                <label
                  key={student.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedStudents.includes(student.id)
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.id)}
                    onChange={() => toggleStudent(student.id)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{student.name}</div>
                    <div className="text-xs text-gray-600">{student.email}</div>
                    <div className="text-xs text-gray-500">{student.tasks_assigned} tasks assigned</div>
                  </div>
                  {selectedStudents.includes(student.id) && (
                    <CheckSquare className="text-blue-600" size={20} />
                  )}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BulkTaskCreator;
