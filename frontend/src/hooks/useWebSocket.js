import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const useWebSocket = () => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn("WebSocket: No auth token found");
      return;
    }
    
    console.log("WebSocket: Connecting with token", token.substring(0, 10) + "...");

    // Initialize socket connection
    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('WebSocket Connected');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket Disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('WebSocket Connection Error:', err);
      setIsConnected(false);
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  const subscribe = useCallback((event, callback) => {
    if (!socketRef.current) return () => {};
    
    socketRef.current.on(event, callback);
    
    return () => {
      if (socketRef.current) {
        socketRef.current.off(event, callback);
      }
    };
  }, []);

  const sendMessage = useCallback((event, data) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('Cannot send message: Socket not connected');
    }
  }, [isConnected]);

  const joinGroup = useCallback((groupId) => {
    sendMessage('join_group', { group_id: groupId });
  }, [sendMessage]);

  const leaveGroup = useCallback((groupId) => {
    sendMessage('leave_group', { group_id: groupId });
  }, [sendMessage]);

  return {
    socket: socketRef.current,
    isConnected,
    subscribe,
    sendMessage,
    joinGroup,
    leaveGroup
  };
};
