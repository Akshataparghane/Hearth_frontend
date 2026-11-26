import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { kindLabel, mediaLabel } from '../media';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { useNotices } from '../components/Notices';

const kinds = [
  { id: 'friends', title: 'Friends', copy: 'Group', icon: 'friends' },
  { id: 'couple', title: 'Couple', copy: 'Two people', icon: 'heart' },
  { id: 'family', title: 'Family', copy: 'Household', icon: 'home' },
  { id: 'call', title: 'Call', copy: 'Camera and chat', icon: 'camera' }
];

export function Lobby() {
  const { token } = useAuth();
  const { notify, revision } = useNotices();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [friends, setFriends] = useState([]);
  const [name, setName] = useState('');
  const [kind, setKind] = useState('friends');
  const [picked, setPicked] = useState([]);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  function load() {
    api('/api/rooms', { token })
      .then((data) => setRooms(data.rooms))
      .catch((err) => setError(err.message));
    api('/api/friends', { token })
      .then((data) => setFriends(data.friends))
      .catch(() => {});
  }

  useEffect(() => {
    load();
    // reload when a notice arrives, such as a room invite
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, revision]);

  function toggleFriend(id) {
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function createRoom(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/rooms', {
        method: 'POST',
        token,
        body: { name, kind, friendIds: picked }
      });
      notify(`Room ${data.room.name} is ready.`);
      navigate(`/room/${data.room.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeRoom(room) {
    if (!window.confirm(`Delete “${room.name}” for everyone, whether the room is open or not?`)) return;
    setError('');
    try {
      await api(`/api/rooms/${room.id}`, { method: 'DELETE', token });
      setRooms((current) => current.filter((item) => item.id !== room.id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function joinRoom(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/rooms/join', { method: 'POST', token, body: { code } });
      navigate(`/room/${data.room.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page lobby">
      <header className="page-head">
        <div>
          <p className="eyebrow">Home</p>
          <h1>Rooms</h1>
          <p className="hint">Watch together, or start a call. Delete a room only if you opened it.</p>
        </div>
        <form className="join-code" onSubmit={joinRoom}>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Room code"
            aria-label="Room code"
          />
          <button className="ghost" type="submit" disabled={busy}>
            Join
          </button>
        </form>
      </header>

      <div className="lobby-grid">
        <form className="panel stack" onSubmit={createRoom}>
          <div>
            <h2>Create a room</h2>
            <p className="hint">Name it, choose who it is for, and invite friends.</p>
          </div>
          <label>
            Room name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Friday episode"
              maxLength={60}
              required
            />
          </label>
          <div className="kind-picker">
            {kinds.map((item) => (
              <label key={item.id} className={kind === item.id ? 'kind on' : 'kind'}>
                <input
                  type="radio"
                  name="kind"
                  value={item.id}
                  checked={kind === item.id}
                  onChange={() => setKind(item.id)}
                />
                <strong className="field-label">
                  <Icon name={item.icon} size={16} />
                  {item.title}
                </strong>
                <span>{item.copy}</span>
              </label>
            ))}
          </div>
          <div>
            <p className="label">Add friends</p>
            {friends.length === 0 ? (
              <p className="hint">
                No friends yet. <Link to="/friends">Find them</Link>, or share the room code after you open it.
              </p>
            ) : (
              <div className="friend-picks">
                {friends.map((friend) => {
                  const on = picked.includes(friend.id);
                  return (
                    <button
                      key={friend.id}
                      type="button"
                      className={on ? 'friend-pick on' : 'friend-pick'}
                      onClick={() => toggleFriend(friend.id)}
                      aria-pressed={on}
                      aria-label={on ? `Remove ${friend.name}` : `Add ${friend.name}`}
                    >
                      <span className="friend-face">
                        <Avatar name={friend.name} color={friend.color} avatar={friend.avatar} />
                        {on ? <span className="pick-tick" aria-hidden="true">✓</span> : null}
                      </span>
                      <span>{friend.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {kind === 'couple' && picked.length > 1 ? (
              <p className="hint">A couple room is meant for two. You can still invite more.</p>
            ) : null}
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary" type="submit" disabled={busy}>
            {busy ? 'Opening…' : 'Open room'}
          </button>
        </form>

        <section className="room-board">
          <header className="board-head">
            <h2>Your rooms</h2>
            <p>{rooms.length === 0 ? 'None yet' : `${rooms.length} open`}</p>
          </header>
          {rooms.length === 0 ? (
            <div className="panel empty">
              <h2>No rooms yet</h2>
              <p>Create one, then share the code with the people you want inside.</p>
            </div>
          ) : (
            <>
              <div className="room-preview">
                {rooms.slice(0, 4).map((room) => (
                  <RoomCard key={room.id} room={room} onDelete={removeRoom} />
                ))}
              </div>
              <button className="ghost" type="button" onClick={() => setHistoryOpen(true)}>
                Show history
              </button>
            </>
          )}
        </section>
      </div>
      {historyOpen ? (
        <div className="story-pop" role="dialog" aria-label="Room history">
          <div className="history-sheet">
            <header className="board-head">
              <h2>History</h2>
              <button className="ghost tiny" type="button" onClick={() => setHistoryOpen(false)}>Close</button>
            </header>
            <div className="history-grid">
              {rooms.map((room) => (
                <RoomCard key={room.id} room={room} onDelete={removeRoom} />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RoomCard({ room, onDelete }) {
  return (
    <article className="room-card">
      <div className="room-card-top">
        <p className="ticket-kind">{kindLabel(room.kind)}</p>
      </div>
      <h2>{room.name}</h2>
      <p>{room.kind === 'call' ? 'Video call' : mediaLabel(room.media)}</p>
      <div className="room-faces">
        {room.members.slice(0, 4).map((member) => (
          <Avatar key={member.id} name={member.name} color={member.color} avatar={member.avatar} size="sm" />
        ))}
        <span>{room.members.length} {room.members.length === 1 ? 'person' : 'people'}</span>
      </div>
      <div className="room-card-actions">
        <span className="code">{room.code}</span>
        <Link className="primary tiny" to={`/room/${room.id}`}>Open</Link>
        <button className="danger tiny" type="button" onClick={() => onDelete(room)}>
          Delete
        </button>
      </div>
    </article>
  );
}
