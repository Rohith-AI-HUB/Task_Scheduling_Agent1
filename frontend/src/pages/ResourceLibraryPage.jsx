import React, { useState, useEffect } from 'react';
import {
  Upload, FileText, Link as LinkIcon, Search, Star, Trash2,
  Eye, Sparkles, GraduationCap, X, Folder, Plus, Bookmark,
  ChevronRight, Brain, Filter, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { resourceService } from '../services/resource.service';
import HomeButton from '../components/HomeButton';
import FlashcardViewer from '../components/FlashcardViewer';
import GradientButton from '../components/ui/GradientButton';
import NotificationBell from '../components/NotificationBell';
import './ResourceLibraryPage.css';

function ResourceLibraryPage() {
  const [resources, setResources] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Flashcard state
  const [activeFlashcards, setActiveFlashcards] = useState(null);
  const [viewingTitle, setViewingTitle] = useState('');

  // Note form
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState('');

  // Link form
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkDescription, setLinkDescription] = useState('');
  const [linkTags, setLinkTags] = useState('');

  useEffect(() => {
    fetchResources();
  }, [filter]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const data = await resourceService.getResources(filter);
      setResources(data.resources);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchResources();
      return;
    }

    setLoading(true);
    try {
      const data = await resourceService.searchResources(searchQuery);
      setResources(data.results);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNote = async () => {
    try {
      const tags = noteTags.split(',').map(t => t.trim()).filter(t => t);
      await resourceService.createNote(noteTitle, noteContent, tags);
      setShowNoteModal(false);
      setNoteTitle('');
      setNoteContent('');
      setNoteTags('');
      fetchResources();
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  const createLink = async () => {
    try {
      const tags = linkTags.split(',').map(t => t.trim()).filter(t => t);
      await resourceService.createLink(linkTitle, linkUrl, linkDescription, tags);
      setShowLinkModal(false);
      setLinkTitle('');
      setLinkUrl('');
      setLinkDescription('');
      setLinkTags('');
      fetchResources();
    } catch (error) {
      console.error('Error creating link:', error);
    }
  };

  const uploadFile = async (file) => {
    try {
      await resourceService.uploadFile(file);
      setShowUploadModal(false);
      fetchResources();
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const toggleFavorite = async (resourceId, currentFavorite) => {
    try {
      await resourceService.toggleFavorite(resourceId, !currentFavorite);
      fetchResources();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const deleteResource = async (resourceId) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    try {
      await resourceService.deleteResource(resourceId);
      fetchResources();
    } catch (error) {
      console.error('Error deleting resource:', error);
    }
  };

  const generateFlashcards = async (resourceId) => {
    try {
      const response = await resourceService.generateFlashcards(resourceId);
      alert(`Generated ${response.count} flashcards!`);
      fetchResources();
    } catch (error) {
      console.error('Error generating flashcards:', error);
    }
  };

  const handleStudy = (resource) => {
    if (resource.flashcards && resource.flashcards.length > 0) {
      setActiveFlashcards(resource.flashcards);
      setViewingTitle(resource.title);
    }
  };

  return (
    <div className="resource-container">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="resource-header">
          <div className="resource-title">
            <h1 className="flex items-center gap-3">
              <Folder className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
              Resource Library
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium italic">
              AI-organized knowledge base for your academic success
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setShowNoteModal(true)}
                className="p-3 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md rounded-xl border border-white/50 dark:border-gray-700/50 text-indigo-600 dark:text-indigo-400 hover:scale-105 transition-all shadow-sm"
                title="New Note"
              >
                <Plus size={22} />
              </button>
              <button
                onClick={() => setShowLinkModal(true)}
                className="p-3 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md rounded-xl border border-white/50 dark:border-gray-700/50 text-blue-600 dark:text-blue-400 hover:scale-105 transition-all shadow-sm"
                title="Save Link"
              >
                <LinkIcon size={22} />
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="p-3 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md rounded-xl border border-white/50 dark:border-gray-700/50 text-purple-600 dark:text-purple-400 hover:scale-105 transition-all shadow-sm"
                title="Upload File"
              >
                <Upload size={22} />
              </button>
            </div>
            <NotificationBell />
            <HomeButton />
          </div>
        </div>

        {/* Search Bar Container */}
        <div className="search-container">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search notes, files, and links..."
            />
          </div>
          <GradientButton
            variant="purple"
            onClick={handleSearch}
            className="px-8 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
          >
            Search
          </GradientButton>
        </div>

        {/* Filters */}
        <div className="filter-pills">
          {[
            { id: 'all', label: 'All Library', icon: <Folder size={16} /> },
            { id: 'note', label: 'My Notes', icon: <FileText size={16} /> },
            { id: 'link', label: 'Saved Links', icon: <LinkIcon size={16} /> },
            { id: 'pdf', label: 'PDFs', icon: <Bookmark size={16} /> },
            { id: 'code', label: 'Snippets', icon: <Sparkles size={16} /> },
            { id: 'image', label: 'Media', icon: <Eye size={16} /> }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setFilter(opt.id)}
              className={`filter-pill ${filter === opt.id ? 'active' : ''}`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>

        {/* Resources Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="resource-glass-card h-64 animate-pulse bg-gray-100/50 dark:bg-gray-800/50"></div>
            ))}
          </div>
        ) : resources.length === 0 ? (
          <div className="resource-glass-card p-20 text-center border-dashed border-2 border-indigo-200 dark:border-indigo-900/50">
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Folder className="w-10 h-10 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Items Found</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto font-medium italic">
              Your library is currently empty. Start adding notes, links, or files to build your knowledge base.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {resources.map(resource => (
                <ResourceCard
                  key={resource._id}
                  resource={resource}
                  onToggleFavorite={toggleFavorite}
                  onDelete={deleteResource}
                  onGenerateFlashcards={generateFlashcards}
                  onStudy={handleStudy}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Modals - Simplified for the refactor, keeping standard structure */}
        <AnimatePresence>
          {showNoteModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowNoteModal(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="resource-modal relative w-full max-w-2xl rounded-3xl p-8 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <FileText className="text-indigo-500" size={28} />
                    Create New Note
                  </h3>
                  <button onClick={() => setShowNoteModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <X size={24} className="text-gray-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">NOTE TITLE</label>
                    <input
                      type="text"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      placeholder="Enter a descriptive title..."
                      className="modal-input font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">CONTENT (MARKDOWN)</label>
                    <textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      rows="8"
                      placeholder="Write your knowledge here..."
                      className="modal-input font-medium font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">TAGS (COMMA SEPARATED)</label>
                    <input
                      type="text"
                      value={noteTags}
                      onChange={(e) => setNoteTags(e.target.value)}
                      placeholder="e.g. biology, midterms, critical"
                      className="modal-input"
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <GradientButton
                      variant="purple"
                      onClick={createNote}
                      disabled={!noteTitle || !noteContent}
                      className="flex-1 py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2"
                    >
                      <Sparkles size={20} />
                      Save & Organize with AI
                    </GradientButton>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {showLinkModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowLinkModal(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="resource-modal relative w-full max-w-md rounded-3xl p-8"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <LinkIcon className="text-blue-500" size={28} />
                    Save Web Link
                  </h3>
                  <button onClick={() => setShowLinkModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <X size={24} className="text-gray-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">URL</label>
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://..."
                      className="modal-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">TITLE</label>
                    <input
                      type="text"
                      value={linkTitle}
                      onChange={(e) => setLinkTitle(e.target.value)}
                      placeholder="Page title..."
                      className="modal-input font-bold"
                    />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <GradientButton
                      variant="purple"
                      onClick={createLink}
                      disabled={!linkTitle || !linkUrl}
                      className="flex-1 py-4 rounded-2xl font-bold shadow-lg"
                    >
                      Save Resource
                    </GradientButton>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {showUploadModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowUploadModal(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="resource-modal relative w-full max-w-md rounded-3xl p-8"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <Upload className="text-purple-500" size={28} />
                    Upload Asset
                  </h3>
                  <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <X size={24} className="text-gray-400" />
                  </button>
                </div>

                <div className="border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 rounded-3xl p-10 text-center bg-indigo-50/30 dark:bg-indigo-950/20 hover:border-indigo-500 transition-all group">
                  <Upload className="w-12 h-12 text-indigo-400 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-6">Drop files here or click to browse</p>
                  <input
                    type="file"
                    onChange={(e) => e.target.files[0] && uploadFile(e.target.files[0])}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                  />
                </div>
                <p className="text-[10px] font-black text-gray-400 text-center mt-6 uppercase tracking-widest">Supports PDF, DOCX, ZIP, IMAGES & CODE</p>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Flashcard Viewer */}
        {activeFlashcards && (
          <FlashcardViewer
            flashcards={activeFlashcards}
            title={viewingTitle}
            onClose={() => setActiveFlashcards(null)}
          />
        )}
      </div>
    </div>
  );
}

function ResourceCard({ resource, onToggleFavorite, onDelete, onGenerateFlashcards, onStudy }) {
  const [showDetails, setShowDetails] = useState(false);

  const getIcon = () => {
    switch (resource.type) {
      case 'note': return '📝';
      case 'file': return '📄';
      case 'pdf': return '📕';
      case 'code': return '💻';
      case 'link': return '🔗';
      case 'image': return '🖼️';
      default: return '📁';
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="resource-glass-card resource-card"
    >
      <div className="resource-card-header">
        <div className="flex items-center gap-3 flex-1 overflow-hidden">
          <div className="resource-icon flex-shrink-0">{getIcon()}</div>
          <h3 className="resource-title-text truncate">{resource.title}</h3>
        </div>
        <button
          onClick={() => onToggleFavorite(resource._id, resource.favorite)}
          className={`favorite-btn ${resource.favorite ? 'active' : ''}`}
        >
          <Star size={20} fill={resource.favorite ? "currentColor" : "none"} />
        </button>
      </div>

      {resource.ai_summary && (
        <p className="resource-summary">{resource.ai_summary}</p>
      )}

      {resource.tags && resource.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {resource.tags.slice(0, 3).map(tag => (
            <span key={tag} className="resource-tag">{tag}</span>
          ))}
          {resource.tags.length > 3 && (
            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 mt-1">+{resource.tags.length - 3} MORE</span>
          )}
        </div>
      )}

      <div className="card-actions">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="card-action-btn btn-view"
        >
          <Eye size={14} />
          {showDetails ? 'LESS' : 'INFO'}
        </button>

        {resource.flashcards && resource.flashcards.length > 0 ? (
          <button
            onClick={() => onStudy(resource)}
            className="card-action-btn btn-study"
          >
            <GraduationCap size={14} />
            STUDY
          </button>
        ) : (
          (resource.type === 'note' || resource.type === 'text' || resource.type === 'pdf') && (
            <button
              onClick={() => onGenerateFlashcards(resource._id)}
              className="card-action-btn btn-view bg-indigo-100/50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
            >
              <Sparkles size={14} />
              CARDS
            </button>
          )
        )}

        <button
          onClick={() => onDelete(resource._id)}
          className="card-action-btn btn-delete flex-shrink-0"
          style={{ flex: '0 0 auto' }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 space-y-4">
              {resource.ai_key_points && resource.ai_key_points.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Brain size={12} className="text-indigo-500" /> Key Insights
                  </h4>
                  <ul className="space-y-1.5">
                    {resource.ai_key_points.map((point, idx) => (
                      <li key={idx} className="text-xs text-gray-600 dark:text-gray-400 font-medium leading-relaxed">• {point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {resource.type === 'link' && resource.file_url && (
                <div className="pt-2">
                  <a
                    href={resource.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors uppercase tracking-widest"
                  >
                    Launch Source <ChevronRight size={12} />
                  </a>
                </div>
              )}

              <div className="text-[10px] font-black text-gray-400 uppercase tracking-tighter pt-2 border-t border-gray-50 dark:border-gray-800/50">
                ADDED: {resource.created_at ? new Date(resource.created_at).toLocaleDateString() : 'UNKNOWN'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default ResourceLibraryPage;