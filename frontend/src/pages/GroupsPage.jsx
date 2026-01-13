import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Plus, Trash2, Send, ChevronRight,
  Search, User, ClipboardList, Info, AlertCircle,
  CheckCircle2, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationBell from '../components/NotificationBell';
import HomeButton from '../components/HomeButton';
import { useAuth } from '../store/useStore';
import { groupService } from '../services/group.service';
import { taskService } from '../services/task.service';
import GradientButton from '../components/ui/GradientButton';
import './GroupsPage.css';

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    member_ids: []
  });
  const [assignData, setAssignData] = useState({
    task_id: ''
  });

  const navigate = useNavigate();
  const { isTeacher, isStudent } = useAuth();

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [coordinatorGroups, memberGroups, tasksData] = await Promise.all([
        groupService.getGroups(),
        groupService.getMyGroups(),
        taskService.getTasks()
      ]);

      // Combine both types of groups, avoiding duplicates (though they should be distinct)
      const allGroups = [...coordinatorGroups];
      memberGroups.forEach(mg => {
        if (!allGroups.find(ag => ag.id === mg.id)) {
          allGroups.push(mg);
        }
      });

      setGroups(allGroups);
      setTasks(tasksData);
    } catch (err) {
      setError('System connection interrupted. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      await groupService.createGroup(formData);
      setSuccess('Project team assembled successfully!');
      setShowCreateForm(false);
      setFormData({ name: '', member_ids: [] });
      await loadInitialData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Operation failed. Check member IDs.');
      setTimeout(() => setError(''), 4000);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!confirm('Dissolve this group? This action cannot be undone.')) return;
    try {
      await groupService.deleteGroup(groupId);
      setSuccess('Group dissolved.');
      await loadInitialData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Could not delete group.');
    }
  };

  const handleAssignTask = async (groupId) => {
    try {
      await groupService.assignTask(groupId, assignData.task_id);
      setSuccess('Task broadcasted to all group members!');
      setShowAssignForm(null);
      setAssignData({ task_id: '' });
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError('Failed to broadcast task.');
    }
  };

  const handleMemberIdChange = (e) => {
    const value = e.target.value;
    const ids = value.split(',').map(id => id.trim()).filter(id => id.length > 0);
    setFormData({ ...formData, member_ids: ids });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="groups-container flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-indigo-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <Users className="text-white" size={32} />
          </div>
          <p className="font-bold text-gray-500 italic">Syncing group data...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="groups-container">
      <motion.div
        className="max-w-6xl mx-auto"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header Section */}
        <div className="groups-header">
          <div className="groups-title">
            <h1 className="flex items-center gap-4">
              <Users className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
              Project Coordinator
            </h1>
            <p>Orchestrate teams and broadcast collective assignments</p>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <HomeButton />
          </div>
        </div>

        {/* Messaging Area */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="groups-alert success"
            >
              <CheckCircle2 size={24} />
              {success}
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="groups-alert error"
            >
              <AlertCircle size={24} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Management & Stats */}
          <div className="lg:col-span-4 space-y-6">
            {(isTeacher || isStudent) && (
              <motion.div variants={itemVariants} className="groups-glass-card p-8">
                <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-6">Create New Squad</h3>
                <form onSubmit={handleCreateGroup} className="groups-form space-y-5">
                  <div>
                    <label>Team Identity</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Senior Project Alpha"
                      required
                    />
                  </div>
                  <div>
                    <label>Member Manifest (USNs)</label>
                    <textarea
                      onChange={handleMemberIdChange}
                      rows="3"
                      className="w-full bg-white/50 dark:bg-slate-900/50 border border-indigo-100 dark:border-white/5 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                      placeholder="Enter USNs separated by commas"
                      required
                    />
                    <p className="mt-2 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                      Separated by commas (e.g. 1MS22SCS001, 1MS22SCS002)
                    </p>
                  </div>
                  <GradientButton variant="purple" type="submit" className="w-full py-4 rounded-2xl font-black">
                    Deploy Team
                  </GradientButton>
                </form>
              </motion.div>
            )}

            <motion.div variants={itemVariants} className="groups-glass-card p-8 bg-indigo-600 text-white border-none shadow-indigo-100 dark:shadow-none">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Info size={24} />
                </div>
                <h3 className="text-xl font-bold">Coordinator Guide</h3>
              </div>
              <ul className="space-y-4 text-indigo-50">
                <li className="flex gap-3 text-sm font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-white mt-2 flex-shrink-0" />
                  Broadcast assignments to entire groups instantly.
                </li>
                <li className="flex gap-3 text-sm font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-white mt-2 flex-shrink-0" />
                  Members get automated notifications for new group tasks.
                </li>
                <li className="flex gap-3 text-sm font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-white mt-2 flex-shrink-0" />
                  View real-time participation in the Class Dashboard.
                </li>
              </ul>
            </motion.div>
          </div>

          {/* Right Column: Groups Grid */}
          <div className="lg:col-span-8 space-y-6">
            {groups.length === 0 ? (
              <motion.div variants={itemVariants} className="groups-glass-card p-16 text-center">
                <div className="w-24 h-24 bg-slate-50 dark:bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                  <Users size={48} className="text-slate-300 dark:text-white/20" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">No active groups</h3>
                <p className="text-gray-500 font-medium italic">Begin by forming your first collaborative unit.</p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {groups.map((group, idx) => (
                  <motion.div
                    key={group.id}
                    variants={itemVariants}
                    className="groups-glass-card p-6 flex flex-col h-full"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-extrabold text-gray-900 dark:text-white truncate">
                            {group.name}
                          </h3>
                        </div>
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded">
                          {new Date(group.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {isTeacher && (
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="p-2 text-rose-300 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>

                    <div className="flex-1 space-y-3 mb-6">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Active Members ({group.member_details?.length || 0})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {group.member_details?.map((member, mIdx) => (
                          <div
                            key={member.id}
                            className="member-item p-2 pr-4"
                            title={member.email}
                          >
                            <div className={`member-avatar w-8 h-8 ${mIdx % 2 === 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-purple-100 text-purple-600'}`}>
                              {member.full_name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate max-w-[80px]">
                                {member.full_name.split(' ')[0]}
                              </p>
                              {member.usn && <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">{member.usn}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {isTeacher && (
                      <div className="mt-auto pt-6 border-t border-gray-100 dark:border-white/5">
                        {showAssignForm === group.id ? (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                          >
                            <div className="groups-form">
                              <label>Select Mission</label>
                              <select
                                value={assignData.task_id}
                                onChange={(e) => setAssignData({ task_id: e.target.value })}
                              >
                                <option value="">Choose task...</option>
                                {tasks.map(task => (
                                  <option key={task.id} value={task.id}>{task.title}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex gap-2">
                              <GradientButton
                                variant="green"
                                className="flex-1 py-3 rounded-xl font-bold text-sm"
                                onClick={() => handleAssignTask(group.id)}
                                disabled={!assignData.task_id}
                              >
                                Broadcast
                              </GradientButton>
                              <button
                                onClick={() => setShowAssignForm(null)}
                                className="w-12 h-12 flex items-center justify-center bg-gray-100 dark:bg-white/5 rounded-xl text-gray-400 hover:bg-gray-200 transition-colors"
                              >
                                <X size={20} />
                              </button>
                            </div>
                          </motion.div>
                        ) : (
                          <GradientButton
                            variant="blue"
                            className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                            onClick={() => setShowAssignForm(group.id)}
                          >
                            <ClipboardList size={18} />
                            Deploy Task
                          </GradientButton>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
