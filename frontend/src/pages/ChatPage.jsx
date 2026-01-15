import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send, Search, MoreVertical, Paperclip,
  ArrowLeft, MessageSquarePlus, X, Check, CheckCheck,
  Bot, Users, User, Home, Sparkles, Smile, Image as ImageIcon,
  MoreHorizontal, ChevronRight, Hash, Phone, Video,
  FileText, Command, Trash2, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../store/useStore';
import { chatService } from '../services/chat.service';
import HomeButton from '../components/HomeButton';
import NotificationBell from '../components/NotificationBell';
import './ChatPage.css';

const ChatPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscribe, sendMessage } = useWebSocket();

  // State
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // New chat modal state
  const [showNewChat, setShowNewChat] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Enhanced AI chat state
  const [commandSuggestions, setCommandSuggestions] = useState([]);
  const [showCommandSuggestions, setShowCommandSuggestions] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiContextInfo, setAiContextInfo] = useState(null);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const commandSuggestionRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDate = (timestamp) => {
    try {
      const date = new Date(timestamp);
      const today = new Date();
      if (date.toDateString() === today.toDateString()) return 'Today';
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const fetchChats = async () => {
    try {
      const data = await chatService.getChats();
      // Add AI Assistant as first chat option if not already there
      const aiChat = {
        id: 'ai-assistant',
        type: 'ai',
        name: 'AI Smart Assistant',
        description: 'Upload docs, use /commands, ask anything!',
        last_message: null,
        unread_count: 0
      };
      setChats([aiChat, ...data.conversations || data.chats || []]);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatType, chatId) => {
    try {
      let data;
      if (chatType === 'ai') {
        data = await chatService.getAIHistory();
      } else {
        data = await chatService.getMessages(chatType, chatId);
      }
      setMessages(data.messages || []);
      setTimeout(scrollToBottom, 50);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchAvailableUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await chatService.getUsers();
      setAvailableUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const searchUsers = async (query) => {
    try {
      const data = await chatService.searchUsers(query);
      setAvailableUsers(data.users || []);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  // Fetch command suggestions when user types /
  const fetchCommandSuggestions = useCallback(async (partial) => {
    if (!partial.startsWith('/')) {
      setShowCommandSuggestions(false);
      setCommandSuggestions([]);
      return;
    }
    try {
      const data = await chatService.suggestCommands(partial);
      setCommandSuggestions(data.suggestions || []);
      setShowCommandSuggestions(data.suggestions?.length > 0);
    } catch (error) {
      console.error('Error fetching command suggestions:', error);
    }
  }, []);

  // Handle input change with command detection
  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);
    handleTyping();

    // Check for command prefix
    if (activeChat?.type === 'ai' && value.startsWith('/')) {
      fetchCommandSuggestions(value);
    } else {
      setShowCommandSuggestions(false);
    }
  };

  // Select a command suggestion
  const selectCommandSuggestion = (command) => {
    setNewMessage(command.command + ' ');
    setShowCommandSuggestions(false);
    document.querySelector('.chat-message-input input')?.focus();
  };

  // Handle file selection for AI analysis
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
    event.target.value = '';
  };

  // Remove selected file
  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  // Fetch AI context info
  const fetchAIContext = async () => {
    try {
      const data = await chatService.getAIContext();
      setAiContextInfo(data.context_summary);
    } catch (error) {
      console.error('Error fetching AI context:', error);
    }
  };

  // Clear AI chat history
  const clearAIChatHistory = async () => {
    if (!confirm('Are you sure you want to clear all AI chat history?')) return;
    try {
      await chatService.clearAIHistory();
      setMessages([]);
    } catch (error) {
      console.error('Error clearing AI history:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !activeChat) return;

    const content = newMessage;
    const fileToSend = selectedFile;
    setNewMessage('');
    setSelectedFile(null);
    setShowCommandSuggestions(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      if (activeChat.type === 'ai') {
        // Add user message immediately for responsiveness
        const userMsg = {
          id: Date.now().toString(),
          sender_id: user?.uid || user?._id,
          sender_name: user?.full_name || 'You',
          content: fileToSend ? `${content}\n📎 ${fileToSend.name}` : content,
          timestamp: new Date().toISOString(),
          chat_type: 'ai',
          has_document: !!fileToSend
        };
        setMessages(prev => [...prev, userMsg]);
        setTimeout(scrollToBottom, 50);

        setIsProcessingAI(true);

        // Use enhanced AI endpoint with document support
        const response = await chatService.sendAIMessage(content, fileToSend);

        setIsProcessingAI(false);
        setMessages(prev => [...prev, response.message]);
        setTimeout(scrollToBottom, 50);

        // Show notification for command execution
        if (response.command_executed) {
          console.log('Command executed:', response.command_result);
        }
      } else {
        await chatService.sendMessage(activeChat.type, activeChat.id, content);
        sendMessage('typing_stop', { chat_type: activeChat.type, chat_id: activeChat.id });
        setIsTyping(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsProcessingAI(false);
      // Show error message
      const errorMsg = {
        id: Date.now().toString(),
        sender_id: 'ai_assistant',
        sender_name: 'AI Assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString(),
        chat_type: 'ai'
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !activeChat) return;

    // For AI chat, set the file for analysis instead of uploading
    if (activeChat.type === 'ai') {
      setSelectedFile(file);
      event.target.value = '';
      return;
    }

    // For regular chat, upload and send as before
    try {
      const uploadData = await chatService.uploadFile(file);
      const absoluteUrl = typeof uploadData?.url === 'string' && uploadData.url.startsWith('http')
        ? uploadData.url
        : `http://localhost:8000${uploadData.url || ''}`;
      const fileMessage = `📎 [${uploadData.filename}](${absoluteUrl})`;

      await chatService.sendMessage(activeChat.type, activeChat.id, fileMessage);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(error.response?.data?.detail || 'Error uploading file');
    } finally {
      event.target.value = '';
    }
  };

  const handleTyping = () => {
    if (!activeChat || activeChat.type === 'ai') return;
    if (!isTyping) {
      setIsTyping(true);
      sendMessage('typing_start', { chat_type: activeChat.type, chat_id: activeChat.id });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendMessage('typing_stop', { chat_type: activeChat.type, chat_id: activeChat.id });
    }, 2000);
  };

  const startChatWithUser = (selectedUser) => {
    const newChat = {
      id: selectedUser.id,
      type: 'direct',
      name: selectedUser.name,
      role: selectedUser.role,
      unread_count: 0
    };
    setActiveChat(newChat);
    setShowNewChat(false);
    setChats(prev => {
      const exists = prev.some(c => c.id === selectedUser.id && c.type === 'direct');
      if (!exists) return [prev[0], newChat, ...prev.slice(1)];
      return prev;
    });
  };

  // WebSocket Effects
  useEffect(() => {
    const unsubMsg = subscribe('new_message', (data) => {
      if (activeChat && data.chat_type === activeChat.type && data.chat_id === activeChat.id) {
        setMessages(prev => [...prev, data.message]);
        setTimeout(scrollToBottom, 50);
      }
      fetchChats();
    });

    const unsubTyping = subscribe('user_typing', (data) => {
      if (activeChat && data.chat_type === activeChat.type && data.chat_id === activeChat.id) {
        setTypingUsers(prev => {
          const updated = new Set(prev);
          data.typing ? updated.add(data.user_name) : updated.delete(data.user_name);
          return updated;
        });
      }
    });

    return () => { unsubMsg(); unsubTyping(); };
  }, [subscribe, activeChat]);

  useEffect(() => { fetchChats(); }, []);
  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat.type, activeChat.id);
      setTypingUsers(new Set());
    }
  }, [activeChat]);

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="chat-container">
      {/* Sidebar Section */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="chat-sidebar"
      >
        <div className="sidebar-header">
          <div className="sidebar-title">
            <h1>Messages</h1>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowNewChat(true); fetchAvailableUsers(); }}
                className="p-2 hover:bg-white/50 rounded-xl transition-all"
                title="New Chat"
              >
                <MessageSquarePlus size={22} className="text-indigo-600" />
              </button>
              <NotificationBell />
              <HomeButton />
            </div>
          </div>
          <div className="search-area">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="chat-list">
          {loading ? (
            <div className="p-8 text-center animate-pulse">
              <div className="w-12 h-12 bg-indigo-100 rounded-full mx-auto mb-4" />
              <div className="h-4 bg-gray-100 rounded w-24 mx-auto" />
            </div>
          ) : filteredChats.map((chat, idx) => (
            <motion.div
              key={`${chat.type}-${chat.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setActiveChat(chat)}
              className={`chat-item ${activeChat?.id === chat.id ? 'active' : ''}`}
            >
              <div className={`chat-avatar ${chat.type === 'ai' ? 'ai' : ''}`}>
                {chat.type === 'ai' ? <Bot size={24} /> : getInitials(chat.name)}
              </div>
              <div className="chat-info">
                <div className="chat-name-row">
                  <span className="chat-name">{chat.name}</span>
                  <span className="chat-time">
                    {chat.last_message ? formatDate(chat.last_message.timestamp) : ''}
                  </span>
                </div>
                <div className="chat-preview">
                  {chat.type === 'ai' ? chat.description : (chat.last_message?.content || 'No messages yet')}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Main Chat Display */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="chat-main"
      >
        {activeChat ? (
          <>
            <div className="chat-main-header">
              <div className="active-chat-info">
                <div className={`chat-avatar ${activeChat.type === 'ai' ? 'ai' : ''}`}>
                  {activeChat.type === 'ai' ? <Bot size={24} /> : getInitials(activeChat.name)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                    {activeChat.name}
                  </h2>
                  <p className="text-xs font-bold text-green-500 uppercase tracking-widest">
                    {activeChat.type === 'ai' ? 'AI Assistant' : 'Active Now'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="action-btn"><Phone size={20} /></button>
                <button className="action-btn"><Video size={20} /></button>
                <button className="action-btn"><MoreHorizontal size={22} /></button>
              </div>
            </div>

            <div className="messages-scroller">
              <AnimatePresence mode="popLayout">
                {messages.map((msg, index) => {
                  const isOwn = msg.sender_id === user?.uid || msg.sender_id === user?._id;
                  const showTime = index === messages.length - 1 ||
                    new Date(messages[index + 1]?.timestamp) - new Date(msg.timestamp) > 300000;

                  return (
                    <motion.div
                      key={msg.id || index}
                      initial={{ opacity: 0, scale: 0.9, x: isOwn ? 10 : -10 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      className={`message-row ${isOwn ? 'sent' : 'received'}`}
                    >
                      <div className="message-bubble">
                        {msg.content}
                        <div className="message-meta">
                          {formatTime(msg.timestamp)}
                          {isOwn && <CheckCheck size={14} className="text-indigo-200" />}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {typingUsers.size > 0 && (
                <div className="flex items-center gap-2 p-4 text-xs font-bold text-indigo-400 italic">
                  <div className="flex gap-1 animate-pulse">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                  </div>
                  Someone is crafting a response...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
              {/* Command Suggestions Dropdown */}
              <AnimatePresence>
                {showCommandSuggestions && commandSuggestions.length > 0 && (
                  <motion.div
                    ref={commandSuggestionRef}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full left-0 right-0 mb-2 mx-4 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-indigo-100 overflow-hidden z-50"
                  >
                    <div className="p-2 text-xs font-bold text-indigo-400 uppercase tracking-wider border-b border-indigo-50">
                      <Command size={12} className="inline mr-1" /> Available Commands
                    </div>
                    {commandSuggestions.map((cmd, idx) => (
                      <div
                        key={idx}
                        onClick={() => selectCommandSuggestion(cmd)}
                        className="px-4 py-3 hover:bg-indigo-50 cursor-pointer transition-colors border-b border-indigo-50/50 last:border-0"
                      >
                        <div className="font-mono font-bold text-indigo-600">{cmd.command}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{cmd.description}</div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Selected File Preview */}
              <AnimatePresence>
                {selectedFile && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full left-0 right-0 mb-2 mx-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-3 flex items-center gap-3 border border-indigo-100"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                      <FileText size={20} className="text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 truncate">{selectedFile.name}</div>
                      <div className="text-xs text-gray-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB - Ready for AI analysis
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeSelectedFile}
                      className="p-2 hover:bg-red-100 rounded-xl transition-colors"
                    >
                      <X size={18} className="text-red-500" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* AI Processing Indicator */}
              {isProcessingAI && (
                <div className="absolute bottom-full left-0 right-0 mb-2 mx-4 bg-indigo-50 rounded-2xl p-3 flex items-center gap-3 border border-indigo-100">
                  <Loader2 size={20} className="text-indigo-600 animate-spin" />
                  <span className="text-sm font-medium text-indigo-600">AI is thinking...</span>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="input-wrapper relative">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="action-btn"
                  title={activeChat?.type === 'ai' ? 'Upload document for analysis' : 'Attach file'}
                >
                  <Paperclip size={20} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept={activeChat?.type === 'ai' ? '.pdf,.doc,.docx,.txt,.md,.py,.js,.jsx,.ts,.tsx,.java,.cpp,.c,.h,.json,.xml,.png,.jpg,.jpeg,.gif' : '*'}
                  className="hidden"
                />
                {activeChat?.type === 'ai' && (
                  <button
                    type="button"
                    onClick={clearAIChatHistory}
                    className="action-btn"
                    title="Clear chat history"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <textarea
                  ref={textareaRef}
                  placeholder={activeChat?.type === 'ai' ? 'Ask anything or use /commands...' : 'Type a message...'}
                  value={newMessage}
                  onChange={(e) => {
                    handleInputChange(e);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  className="chat-message-input"
                  rows={1}
                />
                <button type="submit" className="action-btn send-btn" disabled={isProcessingAI || (!newMessage.trim() && !selectedFile)}>
                  {isProcessingAI ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="chat-empty-state">
            <div className="empty-icon shadow-xl">
              <Bot size={48} />
            </div>
            <h3>Intelligent Workspace Chat</h3>
            <p className="max-w-xs font-medium italic opacity-70">
              Select a collaborator or speak with our AI Assistant to streamline your workflow.
            </p>
          </div>
        )}
      </motion.div>

      {/* New Chat Modal */}
      <AnimatePresence>
        {showNewChat && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewChat(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="chat-modal relative p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Start Conversation
                </h3>
                <button onClick={() => setShowNewChat(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={24} className="text-gray-400" />
                </button>
              </div>

              <div className="search-area mb-6">
                <Search className="search-icon" size={18} />
                <input
                  type="text"
                  placeholder="Search collaborators..."
                  value={userSearchQuery}
                  onChange={(e) => { setUserSearchQuery(e.target.value); searchUsers(e.target.value); }}
                  className="w-full bg-slate-50 p-4 pl-12 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {availableUsers.map(u => (
                  <div
                    key={u.id}
                    onClick={() => startChatWithUser(u)}
                    className="flex items-center gap-4 p-3 hover:bg-indigo-50 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-indigo-100 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      {getInitials(u.name)}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-gray-900">{u.name}</div>
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-tighter">{u.role}</div>
                    </div>
                    <ChevronRight size={18} className="text-indigo-200 group-hover:text-indigo-600" />
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatPage;
