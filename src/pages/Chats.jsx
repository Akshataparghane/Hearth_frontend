import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, mediaUrl, shrinkImage, uploadMedia } from '../api';
import { chatColors, wallpaperClass, wallpapers } from '../chatStyle';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { Sticker, stickerIds, stickerLabel } from '../components/Sticker';
import { Stories } from '../components/Stories';
import { useNotices } from '../components/Notices';
import { useAuth } from '../context/AuthContext';
import { playSend } from '../sounds';

function linePreview(item) {
  if (item.viewOnce) return 'View once photo';
  if (item.kind === 'image') return 'Photo';
  if (item.kind === 'video') return 'Video';
  if (item.kind === 'sticker') return stickerLabel(item.media);
  return item.text || item.lastText || '';
}

function shownName(person) {
  return person?.alias || person?.name || 'Friend';
}

function clock(value) {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function Chats() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { lastDirect, lastRead, lastRemoved, clearUnreadChats, armCall, setTyping, typing, presenceOf } = useNotices();
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [person, setPerson] = useState(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [stickersOpen, setStickersOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  const [aliasDraft, setAliasDraft] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [onceView, setOnceView] = useState(null);
  const [actionsFor, setActionsFor] = useState('');
  const [replying, setReplying] = useState(null);
  const [forwarding, setForwarding] = useState(null);
  const logRef = useRef(null);
  const typingTimer = useRef(null);

  async function loadList() {
    const data = await api('/api/chats', { token });
    setChats(data.chats);
  }

  useEffect(() => {
    setMenuOpen(false);
    setNaming(false);
    setActionsFor('');
    setReplying(null);
    setForwarding(null);
  }, [id]);

  useEffect(() => {
    clearUnreadChats();
    loadList().catch((err) => setError(err.message));
  }, [token]);

  useEffect(() => {
    if (!id) {
      setMessages([]);
      setPerson(null);
      return undefined;
    }
    let gone = false;
    api(`/api/chats/${id}/messages`, { token })
      .then((data) => {
        if (gone) return;
        setPerson(data.chat.person);
        setMessages(data.messages);
        api(`/api/chats/${id}/read`, { method: 'POST', token }).catch(() => {});
      })
      .catch((err) => {
        if (!gone) setError(err.message);
      });
    return () => {
      gone = true;
    };
  }, [id, token]);

  useEffect(() => {
    if (!lastDirect) return;
    setChats((current) => {
      const next = current.map((chat) =>
        chat.id === lastDirect.chatId
          ? { ...chat, lastText: linePreview(lastDirect), lastAt: lastDirect.createdAt }
          : chat
      );
      next.sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
      return next;
    });
    if (lastDirect.chatId === id) {
      setMessages((current) => {
        const index = current.findIndex((item) => item.id === lastDirect.id);
        if (index === -1) return [...current, lastDirect];
        const next = current.slice();
        next[index] = lastDirect;
        return next;
      });
      if (String(lastDirect.sender?.id) !== String(user.id)) {
        api(`/api/chats/${id}/read`, { method: 'POST', token }).catch(() => {});
      }
    }
  }, [lastDirect, id, token, user.id]);

  useEffect(() => {
    if (!lastRead || lastRead.chatId !== id) return;
    const ids = new Set(lastRead.ids || []);
    setMessages((current) => current.map((item) => (ids.has(item.id) ? { ...item, read: true } : item)));
  }, [lastRead, id]);

  useEffect(() => {
    if (!lastRemoved?.messageId) return;
    setChats((current) => current.map((chat) => (
      chat.id === lastRemoved.chatId ? { ...chat, lastText: lastRemoved.lastText || '', lastAt: lastRemoved.lastAt } : chat
    )));
    if (lastRemoved.chatId === id) {
      setMessages((current) => current.filter((item) => item.id !== lastRemoved.messageId));
    }
  }, [lastRemoved, id]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, id]);

  function remember(message) {
    playSend();
    setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
    setChats((current) =>
      current
        .map((chat) => (chat.id === id ? { ...chat, lastText: linePreview(message), lastAt: message.createdAt } : chat))
        .sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt))
    );
  }

  async function send(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !id) return;
    setDraft('');
    setTyping(id, false);
    setError('');
    try {
      const data = await api(`/api/chats/${id}/messages`, { method: 'POST', token, body: { text, replyTo: replying?.id } });
      setReplying(null);
      remember(data.message);
    } catch (err) {
      setDraft(text);
      setError(err.message);
    }
  }

  async function sendSticker(sticker) {
    if (!id) return;
    setStickersOpen(false);
    setError('');
    try {
      const data = await api(`/api/chats/${id}/messages`, { method: 'POST', token, body: { kind: 'sticker', sticker, replyTo: replying?.id } });
      setReplying(null);
      remember(data.message);
    } catch (err) {
      setError(err.message);
    }
  }

  async function sendPrepared(file, viewOnce) {
    setError('');
    setPendingFile(null);
    try {
      const prepared = file.type.startsWith('image/') ? await shrinkImage(file) : file;
      const data = await uploadMedia(`/api/chats/${id}/media`, {
        file: prepared,
        token,
        fields: { ...(viewOnce ? { viewOnce: '1' } : {}), ...(replying?.id ? { replyTo: replying.id } : {}) }
      });
      remember(data.message);
      setReplying(null);
    } catch (err) {
      setError(err.message);
    }
  }

  function quoteOf(message) {
    if (!message) return '';
    if (message.viewOnce) return 'View once photo';
    if (message.kind === 'image') return 'Photo';
    if (message.kind === 'video') return 'Video';
    if (message.kind === 'sticker') return stickerLabel(message.media);
    return message.text || '';
  }

  async function removeMessage(message) {
    setActionsFor('');
    if (!window.confirm('Delete this message?')) return;
    try {
      await api(`/api/chats/${id}/messages/${message.id}`, { method: 'DELETE', token });
      setMessages((current) => current.filter((item) => item.id !== message.id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function forwardTo(chatId) {
    if (!forwarding) return;
    try {
      const data = await api(`/api/chats/${chatId}/forward`, {
        method: 'POST',
        token,
        body: { messageId: forwarding.id, from: id }
      });
      if (chatId === id) remember(data.message);
      else playSend();
      setForwarding(null);
    } catch (err) {
      setError(err.message);
    }
  }

  function onPaste(event) {
    const items = Array.from(event.clipboardData?.items || []);
    const imageItem = items.find((item) => item.type.startsWith('image/'));
    const file = imageItem?.getAsFile() || Array.from(event.clipboardData?.files || []).find((item) => item.type.startsWith('image/'));
    if (!file || !id) return;
    event.preventDefault();
    setPendingFile(file);
  }

  function sendFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !id) return;
    if (file.type.startsWith('image/')) setPendingFile(file);
    else sendPrepared(file, false);
  }

  async function clearHistory() {
    setMenuOpen(false);
    if (!window.confirm('Clear every message in this chat?')) return;
    try {
      await api(`/api/chats/${id}/messages`, { method: 'DELETE', token });
      setMessages([]);
      setChats((current) => current.map((chat) => (chat.id === id ? { ...chat, lastText: '' } : chat)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function archiveChat() {
    const current = chats.find((chat) => chat.id === id);
    setMenuOpen(false);
    try {
      const data = await api(`/api/chats/${id}`, { method: 'PATCH', token, body: { archived: !current?.archived } });
      setChats((list) => list.map((chat) => (chat.id === id ? data.chat : chat)));
      navigate('/chats');
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveAlias(event) {
    event.preventDefault();
    try {
      const data = await api(`/api/chats/${id}`, { method: 'PATCH', token, body: { alias: aliasDraft } });
      setPerson(data.chat.person);
      setChats((list) => list.map((chat) => (chat.id === id ? data.chat : chat)));
      setNaming(false);
      setMenuOpen(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteChat() {
    setMenuOpen(false);
    if (!window.confirm('Delete this chat?')) return;
    try {
      await api(`/api/chats/${id}`, { method: 'DELETE', token });
      setChats((current) => current.filter((chat) => chat.id !== id));
      navigate('/chats');
    } catch (err) {
      setError(err.message);
    }
  }

  async function openOnce(message) {
    try {
      const data = await api(`/api/chats/${id}/messages/${message.id}/open`, { method: 'POST', token });
      setOnceView(data.message);
      setMessages((current) => current.map((item) => (item.id === message.id ? { ...item, opened: true, media: '' } : item)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function startCall() {
    if (!id) return;
    setError('');
    try {
      const data = await api(`/api/chats/${id}/call`, { method: 'POST', token });
      armCall({ id: data.ring.id, name: person?.name || 'Friend' });
    } catch (err) {
      setError(err.message);
    }
  }

  function onDraft(value) {
    setDraft(value);
    if (!id) return;
    setTyping(id, true);
    window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => setTyping(id, false), 1200);
  }

  useEffect(() => {
    return () => {
      if (id) setTyping(id, false);
    };
  }, [id, setTyping]);

  const wall = user.chatWallpaper || 'cream';
  const wallStyle = wall.startsWith('/uploads/') ? { backgroundImage: `url(${mediaUrl(wall)})` } : undefined;

  return (
    <div className={`inbox ${id ? 'open' : ''}`}>
      <aside className="inbox-list">
        <header className="inbox-head">
          <p className="eyebrow">Messages</p>
          <h1>{settingsOpen ? 'Settings' : archivedOpen ? 'Archived' : 'Chats'}</h1>
        </header>
        {settingsOpen ? (
          <ChatSettings />
        ) : (
          <>
        {!archivedOpen ? <Stories /> : null}
        {!archivedOpen && chats.some((chat) => chat.archived) ? (
          <button className="archive-entry" type="button" onClick={() => setArchivedOpen(true)}>
            <span>Archived</span>
            <em>{chats.filter((chat) => chat.archived).length}</em>
          </button>
        ) : null}
        {chats.filter((chat) => Boolean(chat.archived) === archivedOpen).length === 0 ? (
          <p className="hint inbox-empty">
            {archivedOpen ? 'No archived chats.' : <>No conversations yet. <Link to="/friends">Find a friend</Link> and message them.</>}
          </p>
        ) : (
          <ul>
            {chats.filter((chat) => Boolean(chat.archived) === archivedOpen).map((chat) => (
              <li key={chat.id}>
                <Link to={`/chats/${chat.id}`} className={chat.id === id ? 'chat-row on' : 'chat-row'}>
                  <Avatar
                    name={chat.person.name}
                    color={chat.person.color}
                    avatar={chat.person.avatar}
                    status={presenceOf(chat.person.id, chat.person.online)}
                  />
                  <span>
                    <strong>{shownName(chat.person)}</strong>
                    <em>{typing[chat.id] ? 'typing' : chat.lastText || 'Say hello'}</em>
                  </span>
                  <time>{clock(chat.lastAt)}</time>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="inbox-foot">
          {archivedOpen ? (
            <button type="button" onClick={() => setArchivedOpen(false)}>Back to chats</button>
          ) : null}
          <button type="button" onClick={() => { setSettingsOpen(true); setArchivedOpen(false); }}>
            Settings
          </button>
        </div>
          </>
        )}
        {settingsOpen ? (
          <div className="inbox-foot">
            <button type="button" onClick={() => setSettingsOpen(false)}>Back to chats</button>
          </div>
        ) : null}
      </aside>

      <section className="thread">
        {!id ? (
          <div className="thread-empty">
            <Icon name="chat" size={36} />
            <h2>Pick a conversation</h2>
            <p>Messages stay here, separate from a call. You can start a call from the chat.</p>
          </div>
        ) : (
          <>
            <header className="thread-bar">
              <Link to="/chats" className="ghost tiny back-link" aria-label="Back to chats">
                Chats
              </Link>
              {person ? (
                <div className="thread-person">
                  <Avatar
                    name={person.name}
                    color={person.color}
                    avatar={person.avatar}
                    status={presenceOf(person.id, person.online)}
                  />
                  <div>
                    <strong>{shownName(person)}</strong>
                    <p>{typing[id] ? 'typing' : `@${person.personalId}`}</p>
                  </div>
                </div>
              ) : (
                <strong>Chat</strong>
              )}
              <button className="primary tiny" type="button" onClick={startCall}>
                <Icon name="camera" size={16} />
                Call
              </button>
              <div className="menu-wrap">
                <button className="ghost tiny" type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="Chat options">
                  •••
                </button>
                {menuOpen ? (
                  <div className="chat-menu">
                    <button type="button" className="menu-danger" onClick={deleteChat}>Delete chat</button>
                    <button type="button" onClick={clearHistory}>Clear history</button>
                    <button type="button" onClick={archiveChat}>{chats.find((chat) => chat.id === id)?.archived ? 'Unarchive' : 'Archive'}</button>
                    <button
                      type="button"
                      onClick={() => {
                        setNaming(true);
                        setAliasDraft(person?.alias || '');
                      }}
                    >
                      Edit contact name
                    </button>
                    {naming ? (
                      <form className="alias-form" onSubmit={saveAlias}>
                        <input
                          value={aliasDraft}
                          onChange={(event) => setAliasDraft(event.target.value)}
                          placeholder="Name only you see"
                          maxLength={40}
                          aria-label="Contact name"
                        />
                        <button type="submit">Save</button>
                      </form>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </header>
            <div
              className={`thread-log ${wallpaperClass(wall)}`}
              style={{ ...wallStyle, '--bubble': user.chatColor || '#b85a28' }}
              ref={logRef}
            >
              {messages.length === 0 ? <p className="hint">Send the first message.</p> : null}
              {messages.map((message) => (
                <div key={message.id} className={message.sender?.id === user.id ? 'dm mine' : 'dm'}>
                  {message.forwarded ? <em className="forwarded">Forwarded</em> : null}
                  {message.reply?.text ? (
                    <span className="quote">
                      <strong>{message.reply.name}</strong>
                      <span>{message.reply.text}</span>
                    </span>
                  ) : null}
                  {message.viewOnce && message.sender?.id !== user.id ? (
                    message.opened ? <span>Opened</span> : <button type="button" className="view-once" onClick={() => openOnce(message)}>View once</button>
                  ) : null}
                  {message.kind === 'image' && message.media && !(message.viewOnce && message.sender?.id !== user.id) ? <img src={mediaUrl(message.media)} alt="" /> : null}
                  {message.viewOnce && message.sender?.id === user.id ? <span className="once-note">{message.opened ? 'Opened' : 'View once'}</span> : null}
                  {message.kind === 'video' ? <video src={mediaUrl(message.media)} controls playsInline /> : null}
                  {message.kind === 'sticker' ? <Sticker id={message.media} /> : null}
                  {message.kind === 'text' || !message.kind ? message.text : null}
                  <time>
                    {clock(message.createdAt)}
                    {message.sender?.id === user.id ? (
                      <span className={message.read ? 'ticks read' : 'ticks'} aria-label={message.read ? 'Seen' : 'Sent'}>
                        {message.read ? '✓✓' : '✓'}
                      </span>
                    ) : null}
                  </time>
                  <button type="button" className="dm-more" aria-label="Message actions" onClick={() => setActionsFor((current) => (current === message.id ? '' : message.id))}>
                    •••
                  </button>
                  {actionsFor === message.id ? (
                    <div className="dm-actions">
                      <button type="button" onClick={() => { setReplying({ id: message.id, name: message.sender?.name || 'Message', text: quoteOf(message) }); setActionsFor(''); }}>Reply</button>
                      {message.viewOnce ? null : <button type="button" onClick={() => { setForwarding(message); setActionsFor(''); }}>Forward</button>}
                      <button type="button" onClick={() => removeMessage(message)}>Delete</button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            {stickersOpen ? (
              <div className="sticker-tray">
                <div className="sticker-row">
                  {stickerIds.map((sticker) => (
                    <button key={sticker} type="button" onClick={() => sendSticker(sticker)} aria-label={stickerLabel(sticker)}>
                      <Sticker id={sticker} />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {replying ? (
              <div className="reply-bar">
                <span>
                  <strong>Reply to {replying.name}</strong>
                  <em>{replying.text}</em>
                </span>
                <button type="button" onClick={() => setReplying(null)} aria-label="Cancel reply">×</button>
              </div>
            ) : null}
            <form className="composer thread-compose" onSubmit={send} onPaste={onPaste}>
              <label className="icon-button ghost tiny" aria-label="Add a photo or video">
                <Icon name="plus" size={18} />
                <input type="file" accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime" onChange={sendFile} />
              </label>
              <button className="ghost tiny" type="button" onClick={() => setStickersOpen((open) => !open)} aria-label="Stickers">
                <Sticker id="s02" small />
              </button>
              <input
                value={draft}
                onChange={(event) => onDraft(event.target.value)}
                placeholder="Message"
                maxLength={500}
                aria-label="Message"
                enterKeyHint="send"
              />
              <button className="primary" type="submit">
                Send
              </button>
            </form>
          </>
        )}
        {forwarding ? (
          <div className="story-pop" role="dialog" aria-label="Forward message">
            <div className="story-sheet">
              <h2>Forward</h2>
              <p className="hint">{quoteOf(forwarding)}</p>
              <div className="forward-list">
                {chats.length === 0 ? <p className="hint">No chats yet.</p> : null}
                {chats.map((chat) => (
                  <button key={chat.id} type="button" onClick={() => forwardTo(chat.id)}>
                    {shownName(chat.person)}
                  </button>
                ))}
              </div>
              <button className="ghost" type="button" onClick={() => setForwarding(null)}>Cancel</button>
            </div>
          </div>
        ) : null}
        {pendingFile ? (
          <div className="story-pop" role="dialog" aria-label="Send photo">
            <div className="story-sheet">
              <h2>Send photo</h2>
              <button className="primary" type="button" onClick={() => sendPrepared(pendingFile, false)}>Send</button>
              <button className="ghost" type="button" onClick={() => sendPrepared(pendingFile, true)}>View once</button>
              <button className="ghost" type="button" onClick={() => setPendingFile(null)}>Cancel</button>
            </div>
          </div>
        ) : null}
        {onceView?.media ? (
          <div className="story-pop" role="dialog" aria-label="View once">
            <div className="story-sheet">
              <img src={mediaUrl(onceView.media)} alt="" />
              <button className="primary" type="button" onClick={() => setOnceView(null)}>Close</button>
              <p className="hint">This photo closes after you leave it.</p>
            </div>
          </div>
        ) : null}
        {error ? <p className="form-error thread-error">{error}</p> : null}
      </section>
    </div>
  );
}

function ChatSettings() {
  const { user, token, updateStyle } = useAuth();
  const [error, setError] = useState('');

  const photo = user.chatWallpaper?.startsWith('/uploads/') ? mediaUrl(user.chatWallpaper) : '';

  return (
    <div className="side-settings">
      <section className="set-card">
        <h2>Theme</h2>
        <p>Bright or dark applies to the whole app.</p>
        <div className="theme-switch" role="group" aria-label="Theme">
          <button className={user.theme !== 'dark' ? 'on' : ''} type="button" onClick={() => updateStyle({ theme: 'bright' }).catch((err) => setError(err.message))}>
            <span className="theme-preview bright" />
            Bright
          </button>
          <button className={user.theme === 'dark' ? 'on' : ''} type="button" onClick={() => updateStyle({ theme: 'dark' }).catch((err) => setError(err.message))}>
            <span className="theme-preview dark" />
            Dark
          </button>
        </div>
      </section>
      <section className="set-card">
        <h2>Chat colour</h2>
        <p>Used for the messages you send.</p>
        <div className="swatches">
          {chatColors.map((item) => (
            <button
              key={item.id}
              type="button"
              className={user.chatColor === item.id ? 'swatch on' : 'swatch'}
              onClick={() => updateStyle({ chatColor: item.id }).catch((err) => setError(err.message))}
            >
              <span style={{ background: item.id }} />
              {item.label}
            </button>
          ))}
        </div>
      </section>
      <section className="set-card">
        <h2>Wallpaper</h2>
        <p>The background behind a conversation.</p>
        <div className="wall-choices">
          {wallpapers.map((item) => (
            <button
              key={item.id}
              type="button"
              className={user.chatWallpaper === item.id ? `wall-choice on wall-${item.id}` : `wall-choice wall-${item.id}`}
              onClick={() => updateStyle({ chatWallpaper: item.id }).catch((err) => setError(err.message))}
            >
              <i />
              {item.label}
            </button>
          ))}
        </div>
        <label className={photo ? 'set-upload on' : 'set-upload'}>
          <span>{photo ? 'Your photo is the wallpaper' : 'Set a photo as wallpaper'}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              setError('');
              try {
                const data = await uploadMedia('/api/auth/wallpaper', { file, token });
                await updateStyle({ chatWallpaper: data.user.chatWallpaper });
              } catch (err) {
                setError(err.message);
              }
            }}
          />
        </label>
      </section>
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
