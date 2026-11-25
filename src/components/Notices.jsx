import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { playNotify, startCallSound, stopCallSound, unlockSounds } from '../sounds';
import { createSocket } from '../socket';
import { Avatar } from './Avatar';

const NoticeContext = createContext(null);

export function NoticeProvider({ token, userId, children }) {
  const [toasts, setToasts] = useState([]);
  const [pending, setPending] = useState(0);
  const [unreadChats, setUnreadChats] = useState(0);
  const [lastDirect, setLastDirect] = useState(null);
  const [lastRead, setLastRead] = useState(null);
  const [lastRemoved, setLastRemoved] = useState(null);
  const [storySeen, setStorySeen] = useState(null);
  const [incoming, setIncoming] = useState(null);
  const [outgoing, setOutgoing] = useState(null);
  const [onlineIds, setOnlineIds] = useState(null);
  const [typing, setTypingMap] = useState({});
  const [revision, setRevision] = useState(0);
  const navigate = useNavigate();
  const joinedCall = useRef('');
  const socketRef = useRef(null);

  const notify = useCallback((text) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, text }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  useEffect(() => {
    api('/api/friends', { token })
      .then((data) => setPending(data.incoming?.length || 0))
      .catch(() => {});
  }, [token, revision]);

  useEffect(() => {
    const unlock = () => unlockSounds();
    window.addEventListener('pointerdown', unlock);
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  useEffect(() => {
    const ringing = incoming || (outgoing && !['declined', 'missed', 'cancelled'].includes(outgoing.status));
    if (ringing) startCallSound();
    else stopCallSound();
    return () => stopCallSound();
  }, [incoming, outgoing]);

  useEffect(() => {
    const socket = createSocket(token);
    socket.on('notice', (notice) => {
      if (notice?.text) notify(notice.text);
      setRevision((value) => value + 1);
    });
    socket.on('direct', (message) => {
      setLastDirect(message);
      const mine = message?.sender?.id && String(message.sender.id) === String(userId);
      const openHere = window.location.pathname === `/chats/${message?.chatId}`;
      if (!mine) playNotify();
      if (!mine && !openHere) {
        setUnreadChats((count) => count + 1);
        const label = message?.kind === 'image' ? 'sent a photo' : message?.kind === 'video' ? 'sent a video' : message?.kind === 'sticker' ? 'sent a sticker' : message?.text;
        if (message?.sender?.name && label) notify(`${message.sender.name}: ${label}`);
      }
    });
    socket.on('direct-read', (event) => {
      if (event?.chatId && event.ids) setLastRead({ ...event, at: Date.now() });
    });
    socket.on('direct-delete', (event) => {
      if (event?.chatId && event.messageId) setLastRemoved({ ...event, at: Date.now() });
    });
    socket.on('story-seen', (event) => {
      if (event?.storyId && event.viewer) setStorySeen({ ...event, at: Date.now() });
    });
    socket.on('presence-list', (ids) => {
      setOnlineIds(new Set((ids || []).map(String)));
    });
    socket.on('presence', ({ userId: who, online }) => {
      setOnlineIds((current) => {
        const next = new Set(current || []);
        if (online) next.add(String(who));
        else next.delete(String(who));
        return next;
      });
    });
    socket.on('typing', (event) => {
      setTypingMap((current) => {
        const next = { ...current };
        if (event?.typing) next[event.chatId] = event.name || 'typing';
        else delete next[event.chatId];
        return next;
      });
    });
    socket.on('call-ring', (call) => {
      if (String(call.to) === String(userId)) setIncoming(call);
    });
    socket.on('call-update', (call) => {
      if (call.status === 'answered' && call.roomId && joinedCall.current !== call.id) {
        joinedCall.current = call.id;
        setIncoming(null);
        setOutgoing(null);
        navigate(`/room/${call.roomId}`);
        return;
      }
      if (call.status === 'declined' || call.status === 'cancelled' || call.status === 'missed') {
        setIncoming((current) => (current?.id === call.id ? null : current));
        setOutgoing((current) => (current?.id === call.id ? { ...current, status: call.status } : current));
        if (call.status === 'declined' && String(call.from?.id) === String(userId)) notify('Call declined');
        if (call.status === 'missed') notify('No answer');
      }
    });
    socketRef.current = socket;
    socket.connect();
    return () => {
      socketRef.current = null;
      socket.disconnect();
    };
  }, [token, notify, userId, navigate]);

  const clearUnreadChats = useCallback(() => setUnreadChats(0), []);
  const armCall = useCallback((call) => setOutgoing(call), []);
  const setTyping = useCallback((chatId, active) => {
    socketRef.current?.emit('typing', { chatId, typing: Boolean(active) });
  }, []);
  const presenceOf = useCallback(
    (userId, fallback = false) => {
      if (!onlineIds) return fallback ? 'online' : 'offline';
      return onlineIds.has(String(userId)) ? 'online' : 'offline';
    },
    [onlineIds]
  );

  async function answer() {
    if (!incoming) return;
    try {
      await api(`/api/chats/rings/${incoming.id}/answer`, { method: 'POST', token });
    } catch (err) {
      notify(err.message);
    }
  }

  async function decline() {
    if (!incoming) return;
    const current = incoming;
    setIncoming(null);
    try {
      await api(`/api/chats/rings/${current.id}/decline`, { method: 'POST', token });
    } catch (err) {
      notify(err.message);
    }
  }

  async function cancelCall() {
    if (!outgoing) return;
    const current = outgoing;
    setOutgoing(null);
    try {
      await api(`/api/chats/rings/${current.id}/cancel`, { method: 'POST', token });
    } catch (err) {
      notify(err.message);
    }
  }

  return (
    <NoticeContext.Provider value={{ notify, pending, unreadChats, clearUnreadChats, lastDirect, lastRead, lastRemoved, storySeen, revision, armCall, setTyping, typing, presenceOf }}>
      {children}
      {incoming ? (
        <div className="ring-screen">
          <Avatar name={incoming.from?.name} color={incoming.from?.color} avatar={incoming.from?.avatar} />
          <p className="eyebrow">Incoming call</p>
          <h2>{incoming.from?.name || 'A friend'}</h2>
          <div className="ring-actions">
            <button className="danger" type="button" onClick={decline}>Decline</button>
            <button className="primary" type="button" onClick={answer}>Answer</button>
          </div>
        </div>
      ) : null}
      {outgoing && outgoing.status !== 'declined' && outgoing.status !== 'missed' && outgoing.status !== 'cancelled' ? (
        <div className="ring-screen">
          <p className="eyebrow">Calling</p>
          <h2>{outgoing.name || 'Friend'}</h2>
          <p>Waiting for an answer</p>
          <div className="ring-actions">
            <button className="danger" type="button" onClick={cancelCall}>Cancel</button>
          </div>
        </div>
      ) : null}
      <div className="toasts" aria-live="polite">
        {toasts.map((toast) => (
          <p key={toast.id} className="toast">
            {toast.text}
          </p>
        ))}
      </div>
    </NoticeContext.Provider>
  );
}

export function useNotices() {
  const value = useContext(NoticeContext);
  if (!value) throw new Error('useNotices must be used inside NoticeProvider');
  return value;
}
