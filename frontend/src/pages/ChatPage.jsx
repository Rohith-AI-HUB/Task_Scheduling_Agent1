import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../store/useStore';

const ChatPage = () => {
  const { user } = useAuth();
  const { subscribe, sendMessage } = useWebSocket();

  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch user's chats
  const fetchChats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/chat/chats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChats(response.data.chats);
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
      const response = await axios.get(
        `http://localhost:8000/api/chat/messages/${chatType}/${chatId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(response.data.messages);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:8000/api/chat/send',
        {
          content: newMessage,
          chat_type: activeChat.type,
          chat_id: activeChat.id
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNewMessage('');

      // Stop typing indicator
      sendMessage('typing_stop', {
        chat_type: activeChat.type,
        chat_id: activeChat.id
      });
      setIsTyping(false);

    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (!activeChat) return;

    if (!isTyping) {
      setIsTyping(true);
      sendMessage('typing_start', {
        chat_type: activeChat.type,
        chat_id: activeChat.id
      });
    }

    // Reset timeout
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

  // Subscribe to WebSocket events
  useEffect(() => {
    const unsubscribeNewMessage = subscribe('new_message', (data) => {
      // Add message if it's for the active chat
      if (activeChat &&
          data.chat_type === activeChat.type &&
          data.chat_id === activeChat.id) {
        setMessages(prev => [...prev, data.message]);
        setTimeout(scrollToBottom, 100);
      }

      // Update chat list
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading chats...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Chat List Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold">Messages</h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No conversations yet
            </div>
          ) : (
            chats.map(chat => (
              <div
                key={chat.id}
                onClick={() => setActiveChat(chat)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition ${
                  activeChat?.id === chat.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {chat.name}
                      </h3>
                      {chat.unread_count > 0 && (
                        <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1">
                          {chat.unread_count}
                        </span>
                      )}
                    </div>
                    {chat.last_message && (
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {chat.last_message.content}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {chat.type === 'group' ? '👥' : '💬'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{activeChat.name}</h2>
                  {activeChat.type === 'group' && (
                    <p className="text-sm text-gray-500">
                      {activeChat.members_count} members
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => {
                const isOwnMessage = msg.sender_id === user?.uid || msg.sender_id === user?._id;

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-1' : 'order-2'}`}>
                      {!isOwnMessage && activeChat.type === 'group' && (
                        <p className="text-xs text-gray-500 mb-1">{msg.sender_name}</p>
                      )}
                      <div
                        className={`rounded-lg p-3 ${
                          isOwnMessage
                            ? 'bg-blue-500 text-white'
                            : 'bg-white text-gray-900 border border-gray-200'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <div className="flex items-center justify-between mt-1 gap-2">
                          <p className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-400'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          {msg.edited && (
                            <span className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-400'}`}>
                              (edited)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {typingUsers.size > 0 && (
                <div className="text-sm text-gray-500 italic">
                  {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="text-2xl mb-2">💬</p>
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
