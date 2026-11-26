import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Avatar } from '../components/Avatar';
import { useNotices } from '../components/Notices';
import { useAuth } from '../context/AuthContext';

export function Friends() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { notify, revision, presenceOf } = useNotices();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  async function load() {
    const data = await api('/api/friends', { token });
    setFriends(data.friends);
    setIncoming(data.incoming);
    setOutgoing(data.outgoing);
  }

  async function refreshSearch() {
    if (query.trim().length < 2) return;
    const data = await api(`/api/friends/search?q=${encodeURIComponent(query)}`, { token });
    setResults(data.results);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [token, revision]);

  async function search(event) {
    event.preventDefault();
    setError('');
    setSearched(true);
    try {
      await refreshSearch();
    } catch (err) {
      setError(err.message);
    }
  }

  async function openChat(userId) {
    setError('');
    try {
      const data = await api('/api/chats', { method: 'POST', token, body: { userId } });
      navigate(`/chats/${data.chat.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function run(path, options = {}, success) {
    setError('');
    try {
      await api(path, { token, ...options });
      await load();
      await refreshSearch();
      if (success) notify(success);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">People</p>
          <h1>Friends</h1>
        </div>
      </header>

      <div className="lobby-grid friends-layout">
        <section className="panel stack">
          <h2>Find someone</h2>
          <form className="join-code" onSubmit={search}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name or personal ID"
              aria-label="Search people"
            />
            <button className="primary" type="submit">
              Search
            </button>
          </form>
          {error ? <p className="form-error">{error}</p> : null}
          <ul className="people-list">
            {results.map((person) => (
              <li key={person.id} className="person">
                <Avatar name={person.name} color={person.color} avatar={person.avatar} />
                <div>
                  <strong>{person.name}</strong>
                  <p>@{person.personalId} · {relationCopy(person.relation)}</p>
                </div>
                {person.relation === 'none' && (
                  <button
                    className="ghost"
                    type="button"
                    onClick={() =>
                    run(
                      '/api/friends/requests',
                      { method: 'POST', body: { userId: person.id } },
                      `Friend request sent to ${person.name}.`
                    )
                  }
                  >
                    Add
                  </button>
                )}
                {person.relation === 'incoming' && person.requestId && (
                  <button
                    className="primary tiny"
                    type="button"
                    onClick={() =>
                    run(
                      `/api/friends/requests/${person.requestId}/accept`,
                      { method: 'POST' },
                      `You and ${person.name} are friends.`
                    )
                  }
                  >
                    Accept
                  </button>
                )}
              </li>
            ))}
          </ul>
          {searched && results.length === 0 ? <p className="hint">No one matched. Try their personal ID.</p> : null}
        </section>

        <section className="stack gap">
          <article className="panel">
            <h2>Requests</h2>
            {incoming.length === 0 && outgoing.length === 0 ? <p className="hint">No open requests.</p> : null}
            <ul className="people-list">
              {incoming.map((item) => (
                <li key={item.id} className="person">
                  <Avatar name={item.user.name} color={item.user.color} avatar={item.user.avatar} />
                  <div>
                    <strong>{item.user.name}</strong>
                    <p>@{item.user.personalId} · wants to join your circle</p>
                  </div>
                  <div className="row-actions">
                    <button
                      className="primary tiny"
                      type="button"
                      onClick={() =>
                      run(
                        `/api/friends/requests/${item.id}/accept`,
                        { method: 'POST' },
                        `You and ${item.user.name} are friends.`
                      )
                    }
                    >
                      Accept
                    </button>
                    <button
                      className="ghost tiny"
                      type="button"
                      onClick={() => run(`/api/friends/requests/${item.id}`, { method: 'DELETE' })}
                    >
                      Decline
                    </button>
                  </div>
                </li>
              ))}
              {outgoing.map((item) => (
                <li key={item.id} className="person">
                  <Avatar name={item.user.name} color={item.user.color} avatar={item.user.avatar} />
                  <div>
                    <strong>{item.user.name}</strong>
                    <p>@{item.user.personalId} · request sent</p>
                  </div>
                  <button
                    className="ghost tiny"
                    type="button"
                    onClick={() => run(`/api/friends/requests/${item.id}`, { method: 'DELETE' })}
                  >
                    Cancel
                  </button>
                </li>
              ))}
            </ul>
          </article>

          <article className="panel">
            <h2>Friends</h2>
            {friends.length === 0 ? <p className="hint">When someone accepts, they show up here.</p> : null}
            <ul className="people-list">
              {friends.map((friend) => (
                <li key={friend.id} className="person">
                  <Avatar name={friend.name} color={friend.color} avatar={friend.avatar} status={presenceOf(friend.id)} />
                  <div>
                    <strong>{friend.name}</strong>
                    <p>@{friend.personalId}</p>
                  </div>
                  <button className="ghost tiny" type="button" onClick={() => openChat(friend.id)}>
                    Message
                  </button>
                </li>
              ))}
            </ul>
          </article>
        </section>
      </div>
    </div>
  );
}

function relationCopy(relation) {
  if (relation === 'friends') return 'Already friends';
  if (relation === 'outgoing') return 'Request sent';
  if (relation === 'incoming') return 'Sent you a request';
  return 'Not in your circle yet';
}
