import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5050';

let socket;

export const initSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      auth: {
        token: localStorage.getItem('token')
      }
    });

    socket.on('connect', () => {
      console.log('Connected to Socket.IO');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO');
    });

    socket.on('error', (error) => {
      console.error('Socket.IO error:', error);
    });
  }

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}; 