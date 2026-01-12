import React, { useState, useEffect } from 'react';
import { Upload, FileText, Link as LinkIcon, Search, Star, Trash2, Eye, Sparkles, GraduationCap, X } from 'lucide-react';
import axios from 'axios';
import HomeButton from '../components/HomeButton';
import FlashcardViewer from '../components/FlashcardViewer';
import GradientButton from '../components/ui/GradientButton';
import GlassCard from '../components/ui/GlassCard';

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
    try {
      const token = localStorage.getItem('token');
      const params = filter !== 'all' ? `?type_filter=${filter}` : '';
      const response = await axios.get(`http://localhost:8000/api/resources${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResources(response.data.resources);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching resources:', error);
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchResources();
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:8000/api/resources/search?query=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResources(response.data.results);
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  const createNote = async () => {
    try {
      const token = localStorage.getItem('token');
      const tags = noteTags.split(',').map(t => t.trim()).filter(t => t);

      await axios.post(
        'http://localhost:8000/api/resources/notes',
        {
          title: noteTitle,
          content: noteContent,
          tags: tags
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowNoteModal(false);
      setNoteTitle('');
      setNoteContent('');
      setNoteTags('');
      fetchResources();
    } catch (error) {
      console.error('Error creating note:', error);
      alert('Error creating note');
    }
  };

  const createLink = async () => {
    try {
      const token = localStorage.getItem('token');
      const tags = linkTags.split(',').map(t => t.trim()).filter(t => t);

      await axios.post(
        'http://localhost:8000/api/resources/links',
        {
          title: linkTitle,
          url: linkUrl,
          description: linkDescription,
          tags: tags
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowLinkModal(false);
      setLinkTitle('');
      setLinkUrl('');
      setLinkDescription('');
      setLinkTags('');
      fetchResources();
    } catch (error) {
      console.error('Error creating link:', error);
      alert('Error creating link');
    }
  };

  const uploadFile = async (file) => {
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tags', JSON.stringify([]));

      await axios.post(
        'http://localhost:8000/api/resources/upload',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setShowUploadModal(false);
      fetchResources();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file');
    }
  };

  const toggleFavorite = async (resourceId, currentFavorite) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:8000/api/resources/${resourceId}/favorite?favorite=${!currentFavorite}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchResources();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const deleteResource = async (resourceId) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:8000/api/resources/${resourceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchResources();
    } catch (error) {
      console.error('Error deleting resource:', error);
    }
  };

  const generateFlashcards = async (resourceId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:8000/api/resources/${resourceId}/flashcards`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Generated ${response.data.count} flashcards!`);
      fetchResources();
    } catch (error) {
      console.error('Error generating flashcards:', error);
      alert('Error generating flashcards');
    }
  };

  const handleStudy = (resource) => {
    if (resource.flashcards && resource.flashcards.length > 0) {
      setActiveFlashcards(resource.flashcards);
      setViewingTitle(resource.title);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Resource Library</h1>
          <p className="text-gray-600">Your personal knowledge base with AI-powered organization</p>
        </div>

        <div className="flex gap-2">
          <HomeButton />
          <GradientButton
            variant="purple"
            onClick={() => setShowNoteModal(true)}
            className="flex items-center gap-2"
          >
            <FileText size={18} />
            New Note
          </GradientButton>

          <button
            onClick={() => setShowLinkModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
          >
            <LinkIcon size={18} />
            Save Link
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            className="border-2 border-purple-600 text-purple-600 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-50 transition-all"
          >
            <Upload size={18} />
            Upload File
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search notes, files, and links..."
            className="w-full border-2 border-purple-200 rounded-lg px-4 py-3 pl-12 focus:border-purple-600 focus:ring-2 focus:ring-purple-600 focus:outline-none"
          />
          <Search className="absolute left-4 top-3.5 text-purple-400" size={20} />
        </div>
        <GradientButton
          variant="purple"
          onClick={handleSearch}
          className="px-6 py-3"
        >
          Search
        </GradientButton>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {[
          { id: 'all', label: 'All', icon: '📁' },
          { id: 'note', label: 'Notes', icon: '📝' },
          { id: 'pdf', label: 'PDFs', icon: '📕' },
          { id: 'document', label: 'Documents', icon: '📄' },
          { id: 'text', label: 'Text Files', icon: '📃' },
          { id: 'code', label: 'Code', icon: '💻' },
          { id: 'image', label: 'Images', icon: '🖼️' },
          { id: 'video', label: 'Videos', icon: '🎥' },
          { id: 'link', label: 'Links', icon: '🔗' },
          { id: 'file', label: 'Other Files', icon: '📦' }
        ].map(filterOption => (
          <button
            key={filterOption.id}
            onClick={() => setFilter(filterOption.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === filterOption.id
                ? 'bg-purple-600 text-white scale-105 shadow-md shadow-purple-500/50'
                : 'bg-white/80 text-gray-700 hover:bg-purple-50 hover:text-purple-600 border border-purple-100'
            }`}
          >
            <span className="mr-2">{filterOption.icon}</span>
            {filterOption.label}
          </button>
        ))}
      </div>

      {/* Resources Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-600">Loading resources...</div>
        </div>
      ) : resources.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No resources yet</h3>
          <p className="text-gray-500">Start building your knowledge base!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
        </div>
      )}

      {/* Create Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Create Note</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-purple-700">Title</label>
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Note title..."
                className="w-full border-2 border-purple-200 rounded-lg px-4 py-2 focus:border-purple-600 focus:ring-2 focus:ring-purple-600 focus:outline-none"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-purple-700">Content (Markdown supported)</label>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows="10"
                placeholder="Write your notes here..."
                className="w-full border-2 border-purple-200 rounded-lg px-4 py-2 focus:border-purple-600 focus:ring-2 focus:ring-purple-600 focus:outline-none font-mono"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-purple-700">Tags (comma-separated)</label>
              <input
                type="text"
                value={noteTags}
                onChange={(e) => setNoteTags(e.target.value)}
                placeholder="e.g., python, tutorial, important"
                className="w-full border-2 border-purple-200 rounded-lg px-4 py-2 focus:border-purple-600 focus:ring-2 focus:ring-purple-600 focus:outline-none"
              />
            </div>

            <div className="flex gap-3">
              <GradientButton
                variant="purple"
                onClick={createNote}
                disabled={!noteTitle || !noteContent}
                className="flex-1 py-3 flex items-center justify-center gap-2"
              >
                <Sparkles size={18} />
                Create Note (AI will analyze)
              </GradientButton>
              <button
                onClick={() => {
                  setShowNoteModal(false);
                  setNoteTitle('');
                  setNoteContent('');
                  setNoteTags('');
                }}
                className="px-6 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Save Link</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-purple-700">Title</label>
              <input
                type="text"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="Link title..."
                className="w-full border-2 border-purple-200 rounded-lg px-4 py-2 focus:border-purple-600 focus:ring-2 focus:ring-purple-600 focus:outline-none"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-purple-700">URL</label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="w-full border-2 border-purple-200 rounded-lg px-4 py-2 focus:border-purple-600 focus:ring-2 focus:ring-purple-600 focus:outline-none"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-purple-700">Description (Optional)</label>
              <textarea
                value={linkDescription}
                onChange={(e) => setLinkDescription(e.target.value)}
                rows="3"
                placeholder="What is this link about?"
                className="w-full border-2 border-purple-200 rounded-lg px-4 py-2 focus:border-purple-600 focus:ring-2 focus:ring-purple-600 focus:outline-none"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-purple-700">Tags (comma-separated)</label>
              <input
                type="text"
                value={linkTags}
                onChange={(e) => setLinkTags(e.target.value)}
                placeholder="e.g., tutorial, documentation"
                className="w-full border-2 border-purple-200 rounded-lg px-4 py-2 focus:border-purple-600 focus:ring-2 focus:ring-purple-600 focus:outline-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={createLink}
                disabled={!linkTitle || !linkUrl}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md transition-all"
              >
                Save Link
              </button>
              <button
                onClick={() => {
                  setShowLinkModal(false);
                  setLinkTitle('');
                  setLinkUrl('');
                  setLinkDescription('');
                  setLinkTags('');
                }}
                className="px-6 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload File Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Upload File</h3>

            <div className="mb-6">
              <div className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center hover:border-purple-500 transition-all bg-purple-50/50">
                <Upload className="mx-auto mb-3 text-purple-500" size={32} />
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      uploadFile(e.target.files[0]);
                    }
                  }}
                  className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700 file:cursor-pointer cursor-pointer"
                />
              </div>
              <p className="text-sm text-purple-600 mt-3 text-center">
                Supported: PDF, images, code files, documents
              </p>
            </div>

            <button
              onClick={() => setShowUploadModal(false)}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Flashcard Viewer Modal */}
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
    switch(resource.type) {
      case 'note': return '📝';
      case 'file': return '📄';
      case 'code': return '💻';
      case 'link': return '🔗';
      default: return '📁';
    }
  };

  return (
    <GlassCard borderColor="purple" className="p-4 hover:shadow-xl transition-all hover:scale-105">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-2xl">{getIcon()}</span>
          <h3 className="font-semibold text-lg line-clamp-1">{resource.title}</h3>
        </div>

        <button onClick={() => onToggleFavorite(resource._id, resource.favorite)}>
          <Star
            size={20}
            className={resource.favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
          />
        </button>
      </div>

      {/* AI Summary */}
      {resource.ai_summary && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{resource.ai_summary}</p>
      )}

      {/* Tags */}
      {resource.tags && resource.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {resource.tags.slice(0, 3).map(tag => (
            <span key={tag} className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded border border-purple-300">
              {tag}
            </span>
          ))}
          {resource.tags.length > 3 && (
            <span className="text-xs text-purple-600 font-medium">+{resource.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-sm py-2 rounded flex items-center justify-center gap-1 transition-all"
        >
          <Eye size={14} />
          {showDetails ? 'Hide' : 'View'}
        </button>

        {resource.flashcards && resource.flashcards.length > 0 ? (
          <button
            onClick={() => onStudy(resource)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm px-3 py-2 rounded flex items-center gap-1 shadow-md transition-all"
          >
            <GraduationCap size={14} />
            Study
          </button>
        ) : (
          (resource.type === 'note' || resource.type === 'text' || resource.type === 'pdf') && (
            <button
              onClick={() => onGenerateFlashcards(resource._id)}
              className="bg-purple-100 hover:bg-purple-200 text-purple-700 text-sm px-3 py-2 rounded flex items-center gap-1 border border-purple-300 transition-all"
            >
              <Sparkles size={14} />
              Flashcards
            </button>
          )
        )}

        <button
          onClick={() => onDelete(resource._id)}
          className="bg-red-50 hover:bg-red-100 text-red-700 text-sm px-3 py-2 rounded border border-red-300 transition-all"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Expanded Details */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t">
          {resource.ai_key_points && resource.ai_key_points.length > 0 && (
            <div className="mb-3">
              <h4 className="font-semibold text-sm mb-2">Key Points:</h4>
              <ul className="list-disc list-inside space-y-1">
                {resource.ai_key_points.map((point, idx) => (
                  <li key={idx} className="text-sm text-gray-600">{point}</li>
                ))}
              </ul>
            </div>
          )}

          {resource.flashcards && resource.flashcards.length > 0 && (
            <div className="mb-3">
              <h4 className="font-semibold text-sm mb-2 text-purple-700">Flashcards ({resource.flashcards.length}):</h4>
              <button
                onClick={() => onStudy(resource)}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white p-2 rounded text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <GraduationCap size={14} />
                Start Study Session
              </button>
            </div>
          )}

          {resource.type === 'link' && resource.file_url && (
            <div className="mb-3">
              <a
                href={resource.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-purple-600 hover:text-purple-700 hover:underline font-medium"
              >
                Open Link →
              </a>
            </div>
          )}

          <div className="text-xs text-gray-500">
            Created: {resource.created_at ? new Date(resource.created_at).toLocaleDateString() : 'N/A'}
          </div>
        </div>
      )}
    </GlassCard>
  );
}

export default ResourceLibraryPage;