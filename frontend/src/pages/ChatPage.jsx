import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Send, Search, MoreVertical, Paperclip, Mic,
  ArrowLeft, MessageSquarePlus, X, Check, CheckCheck, Bot, Users, User, Home
} from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../store/useStore';
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

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  // File upload handler
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !activeChat) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      // Upload file
      const uploadResponse = await axios.post(
        'http://localhost:8000/api/chat/upload',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const { url, filename } = uploadResponse.data;
      const fileMessage = `📎 [${filename}](${url})`;

      // Helper to send the message
      const sendMessageToBackend = async (content) => {
        if (activeChat.type === 'ai') {
          const response = await axios.post(
            'http://localhost:8000/api/chat/ai',
            { message: content },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          const userMsg = {
            id: Date.now().toString(),
            sender_id: user?.uid || user?._id,
            sender_name: user?.full_name || 'You',
            content: content,
            timestamp: new Date().toISOString(),
            chat_type: 'ai'
          };

          setMessages(prev => [...prev, userMsg, response.data.message]);
        } else {
          await axios.post(
            'http://localhost:8000/api/chat/send',
            {
              content: content,
              chat_type: activeChat.type,
              chat_id: activeChat.id
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
        setTimeout(scrollToBottom, 100);
      };

      await sendMessageToBackend(fileMessage);

    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Get initials from name
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Format date for separators
  const formatDate = (timestamp) => {
    try {
      const date = new Date(timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) return 'Today';
      if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  // Fetch user's chats
  const fetchChats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/chat/chats', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Add AI Assistant as first chat option
      const aiChat = {
        id: 'ai-assistant',
        type: 'ai',
        name: 'AI Assistant',
        description: 'Your personal task helper',
        last_message: null,
        unread_count: 0
      };

      setChats([aiChat, ...response.data.chats]);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for active chat
  const fetchMessages = async (chatType, chatId) => {
    try {
      const token = localStorage.getItem('token');
      let url;

      if (chatType === 'ai') {
        url = 'http://localhost:8000/api/chat/ai/history';
      } else {
        url = `http://localhost:8000/api/chat/messages/${chatType}/${chatId}`;
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessages(response.data.messages);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Fetch available users for new chat
  const fetchAvailableUsers = async () => {
    setLoadingUsers(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/chat/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Search users
  const searchUsers = async (query) => {
    if (query.length < 2) {
      fetchAvailableUsers();
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:8000/api/chat/users/search?query=${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableUsers(response.data.users);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    try {
      const token = localStorage.getItem('token');

      if (activeChat.type === 'ai') {
        // Send to AI
        const response = await axios.post(
          'http://localhost:8000/api/chat/ai',
          { message: newMessage },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Add user message immediately
        const userMsg = {
          id: Date.now().toString(),
          sender_id: user?.uid || user?._id,
          sender_name: user?.full_name || 'You',
          content: newMessage,
          timestamp: new Date().toISOString(),
          chat_type: 'ai'
        };

        setMessages(prev => [...prev, userMsg, response.data.message]);
        setTimeout(scrollToBottom, 100);
      } else {
        // Send regular message
        await axios.post(
          'http://localhost:8000/api/chat/send',
          {
            content: newMessage,
            chat_type: activeChat.type,
            chat_id: activeChat.id
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Stop typing indicator
        sendMessage('typing_stop', {
          chat_type: activeChat.type,
          chat_id: activeChat.id
        });
        setIsTyping(false);
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (!activeChat || activeChat.type === 'ai') return;

    if (!isTyping) {
      setIsTyping(true);
      sendMessage('typing_start', {
        chat_type: activeChat.type,
        chat_id: activeChat.id
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendMessage('typing_stop', {
        chat_type: activeChat.type,
        chat_id: activeChat.id
      });
    }, 2000);
  };

  // Start new chat with user
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

    // Add to chats if not exists
    setChats(prev => {
      const exists = prev.some(c => c.id === selectedUser.id && c.type === 'direct');
      if (!exists) {
        return [...prev.slice(0, 1), newChat, ...prev.slice(1)];
      }
      return prev;
    });
  };

  // WebSocket subscriptions
  useEffect(() => {
    const unsubscribeNewMessage = subscribe('new_message', (data) => {
      if (activeChat &&
        data.chat_type === activeChat.type &&
        data.chat_id === activeChat.id) {
        setMessages(prev => [...prev, data.message]);
        setTimeout(scrollToBottom, 100);
      }
      fetchChats();
    });

    const unsubscribeTyping = subscribe('user_typing', (data) => {
      if (activeChat &&
        data.chat_type === activeChat.type &&
        data.chat_id === activeChat.id) {
        setTypingUsers(prev => {
          const updated = new Set(prev);
          if (data.typing) {
            updated.add(data.user_name);
          } else {
            updated.delete(data.user_name);
          }
          return updated;
        });
      }
    });

    const unsubscribeMessageEdited = subscribe('message_edited', (data) => {
      if (activeChat &&
        data.chat_type === activeChat.type &&
        data.chat_id === activeChat.id) {
        setMessages(prev =>
          prev.map(msg => msg.id === data.message.id ? data.message : msg)
        );
      }
    });

    const unsubscribeMessageDeleted = subscribe('message_deleted', (data) => {
      if (activeChat &&
        data.chat_type === activeChat.type &&
        data.chat_id === activeChat.id) {
        setMessages(prev => prev.filter(msg => msg.id !== data.message_id));
      }
    });

    return () => {
      unsubscribeNewMessage();
      unsubscribeTyping();
      unsubscribeMessageEdited();
      unsubscribeMessageDeleted();
    };
  }, [subscribe, activeChat]);

  // Load chats on mount
  useEffect(() => {
    fetchChats();
  }, []);

  // Load messages when active chat changes
  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat.type, activeChat.id);
      setTypingUsers(new Set());
    }
  }, [activeChat]);

  // Filter chats by search
  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="chat-container">
        <div className="empty-state">
          <div className="typing-dots">
            <span></span><span></span><span></span>
          </div>
          <p>Loading chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* Sidebar */}
      <div className="chat-sidebar">
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="sidebar-header-avatar">
            {getInitials(user?.full_name)}
          </div>
          <div className="sidebar-header-actions">
            <button onClick={() => navigate('/dashboard')} title="Home">
              <Home size={22} />
            </button>
            <button onClick={() => { setShowNewChat(true); fetchAvailableUsers(); }}>
              <MessageSquarePlus size={22} />
            </button>
            <button><MoreVertical size={22} /></button>
          </div>
        </div>

        {/* Search */}
        <div className="sidebar-search">
          <div className="search-input-wrapper">
            <Search size={18} />
            <input
              type="text"
              className="search-input"
              placeholder="Search or start new chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="chat-list">
          {filteredChats.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#667781' }}>
              No conversations yet
            </div>
          ) : (
            filteredChats.map(chat => (
              <div
                key={`${chat.type}-${chat.id}`}
                onClick={() => setActiveChat(chat)}
                className={`chat-item ${activeChat?.id === chat.id && activeChat?.type === chat.type ? 'active' : ''}`}
              >
                <div className={`chat-item-avatar ${chat.type === 'ai' ? 'ai-avatar' : ''}`}>
                  {chat.type === 'ai' ? <Bot size={24} /> : getInitials(chat.name)}
                </div>
                <div className="chat-item-content">
                  <div className="chat-item-header">
                    <span className="chat-item-name">{chat.name}</span>
                    <span className="chat-item-time">
                      {chat.last_message ? formatTime(chat.last_message.timestamp) : ''}
                    </span>
                  </div>
                  <div className="chat-item-preview">
                    <span className="chat-item-message">
                      {chat.type === 'ai'
                        ? 'Your personal task assistant'
                        : (chat.last_message?.content || (chat.type === 'group' ? `${chat.members_count || 0} members` : 'Start a conversation'))}
                    </span>
                    {chat.unread_count > 0 && (
                      <span className="unread-badge">{chat.unread_count}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      {activeChat ? (
        <div className="chat-area">
          {/* Chat Header */}
          <div className="chat-header">
            <button className="back-button" onClick={() => setActiveChat(null)} style={{ display: 'none' }}>
              <ArrowLeft size={24} color="white" />
            </button>
            <div className={`chat-header-avatar ${activeChat.type === 'ai' ? 'ai-avatar' : ''}`}>
              {activeChat.type === 'ai' ? <Bot size={22} /> : getInitials(activeChat.name)}
            </div>
            <div className="chat-header-info">
              <div className="chat-header-name">{activeChat.name}</div>
              <div className="chat-header-status">
                {activeChat.type === 'ai'
                  ? 'AI Assistant • Online'
                  : activeChat.type === 'group'
                    ? `${activeChat.members_count || 0} members`
                    : 'Online'}
              </div>
            </div>
            <div className="chat-header-actions">
              <button><MoreVertical size={22} /></button>
            </div>
          </div>

          {/* Messages */}
          <div className="messages-container">
            {messages.map((msg, index) => {
              const isOwnMessage = msg.sender_id === user?.uid || msg.sender_id === user?._id;
              const isAI = msg.sender_id === 'ai_assistant';

              // Date separator logic
              const showDateSeparator = index === 0 ||
                formatDate(messages[index - 1]?.timestamp) !== formatDate(msg.timestamp);

              return (
                <div key={msg.id}>
                  {showDateSeparator && (
                    <div className="date-separator">
                      <span>{formatDate(msg.timestamp)}</span>
                    </div>
                  )}
                  <div className={`message-wrapper ${isOwnMessage ? 'sent' : 'received'}`}>
                    <div className={`message-bubble ${isOwnMessage ? 'sent' : 'received'} ${isAI ? 'ai' : ''}`}>
                      {!isOwnMessage && activeChat.type === 'group' && (
                        <div className="message-sender">{msg.sender_name}</div>
                      )}
                      <span className="message-content">{msg.content}</span>
                      <div className="message-meta">
                        <span className="message-time">{formatTime(msg.timestamp)}</span>
                        {isOwnMessage && !isAI && (
                          <span className={`message-status ${msg.read_by?.length > 1 ? 'read' : 'delivered'}`}>
                            <CheckCheck size={16} />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {typingUsers.size > 0 && (
              <div className="typing-indicator">
                <div className="typing-dots">
                  <span></span><span></span><span></span>
                </div>
                <span className="typing-text">
                  {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="input-area">
            <div className="input-actions">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <button onClick={() => fileInputRef.current?.click()}>
                <Paperclip size={24} />
              </button>
            </div>
            <div className="input-wrapper">
              <input
                type="text"
                className="message-input"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(e)}
                placeholder="Type a message"
              />
            </div>
            {newMessage.trim() ? (
              <button className="send-button" onClick={handleSendMessage}>
                <Send size={20} />
              </button>
            ) : (
              <button className="send-button">
                <Mic size={20} />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="empty-state">
          <svg className="empty-state-icon" viewBox="0 0 303 172" fill="none">
            <path d="M229.565 160.229C262.212 149.736 286.931 118.685 286.931 82.137C286.931 36.752 251.026 0 206.495 0C178.105 0 153.152 15.533 138.895 39.222C132.206 35.364 124.468 33.137 116.172 33.137C86.544 33.137 62.545 57.137 62.545 86.765C62.545 89.12 62.709 91.436 63.028 93.706C27.727 95.456 0 123.637 0 157.991C0 159.334 0.034 160.669 0.102 161.997H220.162C223.49 161.997 226.682 161.327 229.565 160.229Z" fill="#DAF7DC" />
            <path d="M137.535 62.529L134.201 95.463L137.535 111.137H165.803L169.137 95.463L165.803 62.529H137.535Z" fill="#075E54" />
            <ellipse cx="151.669" cy="136.137" rx="14.134" ry="14.134" fill="#075E54" />
          </svg>
          <h2>TaskFlow Chat</h2>
          <p>
            Send and receive messages with your teachers, classmates, and AI assistant.
            <br />Select a conversation or start a new chat.
          </p>
        </div>
      )}

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="new-chat-modal" onClick={() => setShowNewChat(false)}>
          <div className="new-chat-content" onClick={e => e.stopPropagation()}>
            <div className="new-chat-header">
              <button onClick={() => setShowNewChat(false)}>
                <ArrowLeft size={24} />
              </button>
              <h3>New Chat</h3>
            </div>

            <div className="new-chat-search">
              <div className="search-input-wrapper">
                <Search size={18} />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by name, email, or USN"
                  value={userSearchQuery}
                  onChange={(e) => {
                    setUserSearchQuery(e.target.value);
                    searchUsers(e.target.value);
                  }}
                />
              </div>
            </div>

            <div className="new-chat-list">
              {/* AI Assistant Option */}
              <div
                className="user-item ai-chat-item"
                onClick={() => {
                  setActiveChat({ id: 'ai-assistant', type: 'ai', name: 'AI Assistant' });
                  setShowNewChat(false);
                }}
              >
                <div className="user-item-avatar">
                  <Bot size={24} />
                </div>
                <div className="user-item-info">
                  <div className="user-item-name">AI Assistant</div>
                  <div className="user-item-role">
                    <Bot size={14} /> Personal task helper with context about your tasks
                  </div>
                </div>
              </div>

              {loadingUsers ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#667781' }}>
                  <div className="typing-dots" style={{ justifyContent: 'center', marginBottom: '8px' }}>
                    <span></span><span></span><span></span>
                  </div>
                  Loading users...
                </div>
              ) : availableUsers.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#667781' }}>
                  No users found
                </div>
              ) : (
                availableUsers.map(u => (
                  <div
                    key={u.id}
                    className="user-item"
                    onClick={() => startChatWithUser(u)}
                  >
                    <div className={`user-item-avatar ${u.role === 'teacher' ? 'teacher' : ''}`}>
                      {getInitials(u.name)}
                    </div>
                    <div className="user-item-info">
                      <div className="user-item-name">{u.name}</div>
                      <div className="user-item-role">
                        {u.role === 'teacher' ? <Users size={14} /> : <User size={14} />}
                        {u.role === 'teacher' ? 'Teacher' : 'Student'}
                        {u.usn && ` • ${u.usn.toUpperCase()}`}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
