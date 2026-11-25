import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_SOCKET_URL || undefined;

export function createSocket(token) {
  return io(URL, { auth: { token }, autoConnect: false });
}
