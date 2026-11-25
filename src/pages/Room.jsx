import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { CallStage } from '../components/CallStage';
import { Avatar } from '../components/Avatar';
import { VideoTile } from '../components/VideoTile';
import { WatchStage } from '../components/WatchStage';
import { useAuth } from '../context/AuthContext';
import { useRoomSession } from '../hooks/useRoomSession';
import { kindLabel, readableText } from '../media';

function usableMedia(media) {
  if (!media || media.kind === 'none' || !media.url) return null;
  return media;
}

export function Room() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const handlersRef = useRef({});
  const liveRef = useRef(false);
  const logRef = useRef(null);
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [media, setMedia] = useState(null);
  const [playback, setPlayback] = useState(null);
  const [online, setOnline] = useState([]);
  const [cueAt, setCueAt] = useState(null);
  const [friends, setFriends] = useState([]);
  const [pick, setPick] = useState('');
  const [draft, setDraft] = useState('');
  const [linkError, setLinkError] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [sharerId, setSharerId] = useState('');
  const [reactions, setReactions] = useState([]);

  handlersRef.current = {
    onState: (state) => {
      liveRef.current = true;
      setMessages(state.messages || []);
      setMedia(usableMedia(state.media));
      setPlayback(state.playback || null);
      setOnline(state.online || []);
    },
    onMessage: (message) =>
      setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message])),
    onMedia: ({ media: next, playback: nextPlayback }) => {
      setMedia(usableMedia(next));
      setPlayback(nextPlayback || null);
      setLinkError('');
    },
    onPlayback: setPlayback,
    onOnline: setOnline,
    onRoster: ({ members, hostId }) => {
      setRoom((current) => (current ? { ...current, members, hostId } : current));
    },
    onCue: ({ at }) => {
      setCueAt(at);
      window.setTimeout(() => setCueAt((current) => (current === at ? null : current)), at - Date.now() + 1200);
    },
    onClosed: () => navigate('/'),
    onError: (message) => setLinkError(message || 'Something went wrong.'),
    onShare: ({ socketId, sharing }) => {
      setSharerId(sharing ? socketId : '');
    },
    onPeerLeft: (socketId) => {
      setSharerId((current) => (current === socketId ? '' : current));
    },
    onReaction: (reaction) => {
      setReactions((current) => [...current, reaction]);
      window.setTimeout(() => {
        setReactions((current) => current.filter((item) => item.id !== reaction.id));
      }, 2600);
    }
  };

  const session = useRoomSession(id, token, handlersRef);

  useEffect(() => {
    const cover = document.createElement('div');
    cover.id = 'capture-blank';
    cover.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cover);
    let timer = 0;

    function blackout() {
      document.documentElement.classList.add('capture-blank');
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        document.documentElement.classList.remove('capture-blank');
      }, 1800);
    }

    function onKey(event) {
      const shot = event.key === 'PrintScreen';
      const shortcut = (event.metaKey || event.ctrlKey) && event.shiftKey && ['3', '4', '5', 's', 'S'].includes(event.key);
      if (!shot && !shortcut) return;
      blackout();
    }

    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKey, true);
      window.clearTimeout(timer);
      document.documentElement.classList.remove('capture-blank');
      cover.remove();
    };
  }, []);

  useEffect(() => {
    let gone = false;
    api(`/api/rooms/${id}`, { token })
      .then((data) => {
        if (gone) return;
        setRoom(data.room);
        if (!liveRef.current) {
          setMessages(data.room.messages || []);
          setMedia(usableMedia(data.room.media));
          setPlayback(data.room.playback);
        }
      })
      .catch((err) => {
        if (!gone) setError(err.message);
      });
    api('/api/friends', { token })
      .then((data) => {
        if (!gone) setFriends(data.friends);
      })
      .catch(() => {});
    return () => {
      gone = true;
    };
  }, [id, token]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages]);

  async function leave() {
    try {
      await api(`/api/rooms/${id}/members/me`, { method: 'DELETE', token });
      navigate('/');
    } catch (err) {
      setLinkError(err.message);
    }
  }

  async function addFriend(event) {
    event.preventDefault();
    if (!pick) return;
    setLinkError('');
    try {
      const data = await api(`/api/rooms/${id}/members`, { method: 'POST', token, body: { userId: pick } });
      setRoom(data.room);
      setPick('');
    } catch (err) {
      setLinkError(err.message);
    }
  }

  function sendChat(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const socket = session.socketRef.current;
    if (!socket?.connected) {
      setLinkError('Chat is still connecting. Try again in a moment.');
      return;
    }
    socket.emit('chat', { text });
    setDraft('');
  }

  async function removeRoom() {
    if (!room || !window.confirm(`Delete “${room.name}” for everyone in it?`)) return;
    try {
      await api(`/api/rooms/${id}`, { method: 'DELETE', token });
      navigate('/');
    } catch (err) {
      setLinkError(err.message);
    }
  }

  async function copyCode() {
    if (!room) return;
    await navigator.clipboard.writeText(room.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  if (error) {
    return (
      <div className="page">
        <div className="panel empty">
          <h1>{error}</h1>
          <button className="primary" type="button" onClick={() => navigate('/')}>
            Back to rooms
          </button>
        </div>
      </div>
    );
  }

  if (!room) return <p className="center-note">Opening the room…</p>;

  const onlineIds = new Set(online.map((item) => item.user?.id));
  const remoteShare = session.remotes.find((remote) => remote.socketId === sharerId);
  const sharedStream = session.sharing ? null : remoteShare?.stream || null;
  const sharedLabel = remoteShare ? `${remoteShare.user?.name || 'Someone'} is sharing` : '';
  const seated = new Set(room.members.map((member) => member.id));
  const available = friends.filter((friend) => !seated.has(friend.id));
  const callOnly = room.kind === 'call';
  const picture = (id) => room.members.find((member) => member.id === id)?.avatar || '';
  const seenPeople = new Set();
  const otherVideos = session.remotes.filter((remote) => {
    const personId = remote.user?.id ? String(remote.user.id) : '';
    if (personId && personId === String(user.id)) return false;
    const key = personId || remote.socketId;
    if (seenPeople.has(key)) return false;
    seenPeople.add(key);
    return true;
  });

  return (
    <div className="theater">
      <header className="room-bar">
        <div>
          <p className="eyebrow">{kindLabel(room.kind)}</p>
          <h1>{room.name}</h1>
        </div>
        <div className="room-actions">
          <button className="ghost" type="button" onClick={copyCode}>
            {copied ? 'Copied' : `Code ${room.code}`}
          </button>
          <button className="danger" type="button" onClick={removeRoom}>
            Delete room
          </button>
          <button className="ghost" type="button" onClick={leave}>
            Leave
          </button>
        </div>
      </header>

      {callOnly ? (
        <CallStage
          localStream={session.localStream}
          localName="You"
          localColor={user.color}
          localAvatar={user.avatar}
          remotes={otherVideos.map((remote) => ({
            ...remote,
            user: { ...remote.user, avatar: picture(remote.user?.id) }
          }))}
          reactions={reactions}
          onReact={(emoji) => session.socketRef.current?.emit('react', { emoji })}
        />
      ) : (
        <WatchStage
          media={media}
          playback={playback}
          cueAt={cueAt}
          linkError={linkError}
          onPlayback={(body) => session.socketRef.current?.emit('playback', body)}
          onCue={() => session.socketRef.current?.emit('cue')}
          onSubmitLink={(url) => session.socketRef.current?.emit('set-media', { url })}
          sharedStream={sharedStream}
          sharedLabel={sharedLabel}
          youAreSharing={session.sharing}
          onShare={session.toggleScreen}
          reactions={reactions}
          onReact={(emoji) => session.socketRef.current?.emit('react', { emoji })}
        />
      )}

      <aside className="sidebar">
        <section>
          <h2>Seats</h2>
          <ul className="people-list compact">
            {room.members.map((member) => (
              <li key={member.id} className="person">
                <Avatar name={member.name} color={member.color} avatar={member.avatar} size="sm" live={onlineIds.has(member.id)} />
                <div>
                  <strong>
                    {member.name}
                    {member.id === user.id ? ' · you' : ''}
                    {member.id === room.hostId ? ' · host' : ''}
                  </strong>
                  <p>
                    {member.personalId ? `@${member.personalId} · ` : ''}
                    {onlineIds.has(member.id) ? 'In the room' : 'Away'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {available.length > 0 && (
            <form className="join-code add-seat" onSubmit={addFriend}>
              <select value={pick} onChange={(event) => setPick(event.target.value)} aria-label="Friend to add">
                <option value="">Add a friend</option>
                {available.map((friend) => (
                  <option key={friend.id} value={friend.id}>
                    {friend.name}
                  </option>
                ))}
              </select>
              <button className="ghost" type="submit">
                Add
              </button>
            </form>
          )}
        </section>

        <section className="chat">
          <h2>Chat</h2>
          <div className="chat-log" ref={logRef}>
            {messages.length === 0 ? <p className="hint">{callOnly ? 'Say hello.' : 'Say what you are about to watch.'}</p> : null}
            {messages.map((message) => (
              <p key={message.id} className="bubble">
                <strong style={{ color: readableText(message.sender?.color) }}>{message.sender?.name || 'Someone'}</strong>
                {message.text}
              </p>
            ))}
          </div>
          <form className="composer" onSubmit={sendChat}>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Message the room"
              maxLength={500}
              aria-label="Message"
              enterKeyHint="send"
            />
            <button className="primary" type="submit">
              Send
            </button>
          </form>
        </section>
      </aside>

      <footer className="callbar">
        {callOnly ? null : (
          <div className="filmstrip">
            <VideoTile
              stream={session.localStream}
              muted
              mirror={!session.sharing}
              name="You"
              color={user.color}
              avatar={user.avatar}
            />
            {otherVideos.map((remote) => (
              <VideoTile
                key={remote.socketId}
                stream={remote.stream}
                name={remote.user?.name || 'Guest'}
                color={remote.user?.color || '#8c8174'}
                avatar={picture(remote.user?.id)}
              />
            ))}
          </div>
        )}
        <div className="controls">
          <button className="ghost" type="button" onClick={session.toggleAudio}>
            {session.audioOn ? 'Mic on' : 'Mic off'}
          </button>
          <button className="ghost" type="button" onClick={session.toggleVideo} disabled={!callOnly && session.sharing}>
            {session.videoOn ? 'Camera on' : 'Camera off'}
          </button>
          {callOnly ? null : (
            <button className="ghost" type="button" onClick={session.toggleScreen}>
              {session.sharing ? 'Stop sharing' : 'Share screen'}
            </button>
          )}
          {session.mediaError ? <p className="hint">{session.mediaError}</p> : null}
        </div>
      </footer>
    </div>
  );
}
