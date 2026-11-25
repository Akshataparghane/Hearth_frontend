import { useEffect, useState } from 'react';
import { api, mediaUrl, shrinkImage, uploadMedia } from '../api';
import { storyColors } from '../chatStyle';
import { useAuth } from '../context/AuthContext';
import { useNotices } from './Notices';
import { Avatar } from './Avatar';
import { playSend } from '../sounds';

const storyEmojis = ['❤️', '😂', '😮', '😢', '🔥', '👏'];

function readDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const media = document.createElement(file.type.startsWith('audio/') ? 'audio' : 'video');
    media.preload = 'metadata';
    media.muted = true;
    media.playsInline = true;
    media.setAttribute('playsinline', '');
    const finish = (duration) => {
      media.onloadedmetadata = null;
      media.ontimeupdate = null;
      media.onerror = null;
      media.removeAttribute('src');
      media.load();
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    const timer = window.setTimeout(() => finish(null), 4000);
    media.onloadedmetadata = () => {
      if (Number.isFinite(media.duration)) {
        window.clearTimeout(timer);
        finish(media.duration);
        return;
      }
      const onTime = () => {
        window.clearTimeout(timer);
        finish(media.duration);
      };
      media.ontimeupdate = onTime;
      try {
        media.currentTime = 1e6;
      } catch {
        window.clearTimeout(timer);
        finish(null);
      }
    };
    media.onerror = () => {
      window.clearTimeout(timer);
      finish(null);
    };
    media.src = url;
    media.load();
  });
}

export function Stories() {
  const { token, user } = useAuth();
  const { storySeen } = useNotices();
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState('');
  const [picker, setPicker] = useState('');
  const [text, setText] = useState('');
  const [color, setColor] = useState('#b85a28');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showSeen, setShowSeen] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [reply, setReply] = useState('');
  const [storyNote, setStoryNote] = useState('');
  const [draftStory, setDraftStory] = useState(null);

  async function load() {
    const data = await api('/api/stories', { token });
    setGroups(data.stories || []);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [token]);

  useEffect(() => {
    if (!storySeen?.storyId || !storySeen.viewer) return;
    setGroups((current) => current.map((group) => {
      if (!group.mine) return group;
      return {
        ...group,
        items: group.items.map((item) => {
          if (item.id !== storySeen.storyId) return item;
          if ((item.viewers || []).some((person) => person.id === storySeen.viewer.id)) return item;
          return { ...item, viewers: [...(item.viewers || []), storySeen.viewer] };
        })
      };
    }));
  }, [storySeen]);

  const mine = groups.find((group) => group.mine);
  const others = groups.filter((group) => !group.mine);
  const currentGroup = viewer ? groups[viewer.group] : null;
  const current = currentGroup?.items[viewer?.item];

  useEffect(() => {
    setReply('');
    setStoryNote('');
  }, [current?.id]);

  async function sendReply(event) {
    event.preventDefault();
    const words = reply.trim();
    if (!words || !current || currentGroup?.mine) return;
    setReply('');
    setStoryNote('');
    try {
      await api(`/api/stories/${current.id}/reply`, { method: 'POST', token, body: { text: words } });
      playSend();
      setStoryNote('Reply sent in chat');
    } catch (err) {
      setStoryNote(err.message);
    }
  }

  async function reactToStory(emoji) {
    if (!current || currentGroup?.mine) return;
    setStoryNote('');
    try {
      await api(`/api/stories/${current.id}/react`, { method: 'POST', token, body: { emoji } });
      playSend();
      setStoryNote(`${emoji} sent`);
      load().catch(() => {});
    } catch (err) {
      setStoryNote(err.message);
    }
  }

  useEffect(() => {
    if (!current || currentGroup?.mine) return undefined;
    api(`/api/stories/${current.id}/seen`, { method: 'POST', token }).catch(() => {});
    return undefined;
  }, [current?.id, token]);

  useEffect(() => {
    if (!current || current.kind === 'video' || current.kind === 'audio') return undefined;
    const timer = window.setTimeout(() => advance(1), 5000);
    return () => window.clearTimeout(timer);
  }, [viewer, current?.id]);

  function openAdd() {
    setViewer(null);
    if ((mine?.items.length || 0) >= 10) {
      setError('You can add up to 10 stories.');
      return;
    }
    setError('');
    setPicker('choose');
  }

  function openGroup(group) {
    const index = groups.findIndex((item) => item.user.id === group.user.id);
    if (index >= 0) setViewer({ group: index, item: 0 });
  }

  function advance(step) {
    if (!viewer) return;
    const group = groups[viewer.group];
    if (!group) {
      setViewer(null);
      return;
    }
    const nextItem = viewer.item + step;
    if (nextItem >= 0 && nextItem < group.items.length) {
      setViewer({ group: viewer.group, item: nextItem });
      return;
    }
    const nextGroup = viewer.group + step;
    if (nextGroup >= 0 && nextGroup < groups.length) {
      const target = groups[nextGroup];
      setViewer({ group: nextGroup, item: step > 0 ? 0 : target.items.length - 1 });
      return;
    }
    setViewer(null);
  }

  function closeDraft() {
    if (draftStory?.url) URL.revokeObjectURL(draftStory.url);
    setDraftStory(null);
  }

  async function stageFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if ((mine?.items.length || 0) >= 10) {
      setError('You can add up to 10 stories.');
      return;
    }
    setError('');
    const looksLikeMedia = /^(video|audio)\//.test(file.type) || /\.(mp4|mov|m4v|webm|3gp|mp3|m4a|wav|aac)$/i.test(file.name);
    const duration = looksLikeMedia ? await readDuration(file) : 0;
    const kind = file.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|3gp)$/i.test(file.name)
      ? 'video'
      : file.type.startsWith('audio/') || /\.(mp3|m4a|wav|aac)$/i.test(file.name)
        ? 'audio'
        : 'image';
    setDraftStory({ kind, file, url: URL.createObjectURL(file), duration: Number.isFinite(duration) ? duration : 0 });
    setPicker('preview');
  }

  function stageText(event) {
    event.preventDefault();
    if (!text.trim()) return;
    if ((mine?.items.length || 0) >= 10) {
      setError('You can add up to 10 stories.');
      return;
    }
    setDraftStory({ kind: 'text', text: text.trim(), duration: 0 });
    setPicker('preview');
  }

  async function uploadDraft() {
    if (!draftStory) return;
    const room = 10 - (mine?.items.length || 0);
    if (room <= 0) {
      setError('You can add up to 10 stories.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      if (draftStory.kind === 'text') {
        await uploadMedia('/api/stories', { token, fields: { text: draftStory.text, color } });
      } else {
        const prepared = draftStory.file.type.startsWith('image/') ? await shrinkImage(draftStory.file) : draftStory.file;
        await uploadMedia('/api/stories', { file: prepared, token, fields: { color }, onProgress: setProgress });
      }
      setText('');
      closeDraft();
      setPicker('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setProgress(0);
    }
  }

  async function removeCurrent() {
    if (!current) return;
    try {
      await api(`/api/stories/${current.id}`, { method: 'DELETE', token });
      setViewer(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="stories">
      <div className="story-row">
        <div className="story-card">
          <button type="button" className="story-face" onClick={() => (mine ? openGroup(mine) : openAdd())}>
            <span className={mine ? 'story-ring' : ''}>
              <Avatar name={user.name} color={user.color} avatar={user.avatar} />
            </span>
            <span>Your story</span>
          </button>
          <button className="story-plus" type="button" onClick={openAdd} aria-label="Add to your story">
            +
          </button>
        </div>
        {others.map((group) => (
          <button key={group.user.id} type="button" className="story-face" onClick={() => openGroup(group)}>
            <span className="story-ring">
              <Avatar name={group.user.name} color={group.user.color} avatar={group.user.avatar} />
            </span>
            <span>{group.user.name}</span>
          </button>
        ))}
      </div>
      {picker ? (
        <div className="story-pop" role="dialog" aria-label="Add a story">
          <div className="story-sheet">
            {picker === 'choose' ? (
              <>
                <h2>Add a story</h2>
                <p className="hint">{mine?.items.length || 0} of 10. Stories stay for 24 hours. A longer video or audio is posted as one story per minute.</p>
                {error ? <p className="form-error">{error}</p> : null}
                <button className="primary" type="button" onClick={() => setPicker('text')} disabled={busy}>
                  Text
                </button>
                <label className="ghost">
                  File
                  <input
                    type="file"
                    accept="image/*,video/*,audio/*"
                    onChange={stageFile}
                    disabled={busy}
                  />
                </label>
                <button className="ghost" type="button" onClick={() => setPicker('')}>
                  Cancel
                </button>
              </>
            ) : picker === 'text' ? (
              <form className="story-compose" onSubmit={stageText}>
                <h2>Text story</h2>
                <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={200} placeholder="Write on your story" />
                <div className="swatches">
                  {storyColors.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={color === item.id ? 'swatch on' : 'swatch'}
                      style={{ background: item.id }}
                      aria-label={item.label}
                      onClick={() => setColor(item.id)}
                    />
                  ))}
                </div>
                <button className="primary" type="submit" disabled={busy || !text.trim()}>
                  Preview
                </button>
                <button className="ghost" type="button" onClick={() => setPicker('choose')}>
                  Back
                </button>
              </form>
            ) : (
              <div className="story-compose">
                <h2>Preview</h2>
                {draftStory?.kind === 'image' ? <img className="story-preview-media" src={draftStory.url} alt="" /> : null}
                {draftStory?.kind === 'video' ? <video className="story-preview-media" src={draftStory.url} controls playsInline /> : null}
                {draftStory?.kind === 'audio' ? <audio src={draftStory.url} controls /> : null}
                {draftStory?.kind === 'text' ? <p className="story-words preview-words" style={{ background: color }}>{draftStory.text}</p> : null}
                {draftStory && draftStory.duration > 60 ? (
                  <p className="hint">
                    This is longer than 1 minute, so it will be posted as {Math.min(Math.ceil(draftStory.duration / 60), 10 - (mine?.items.length || 0))} stories.
                  </p>
                ) : null}
                {error ? <p className="form-error">{error}</p> : null}
                {busy ? <p className="hint">{progress ? `Uploading… ${progress}%` : 'Uploading…'}</p> : null}
                <button className="primary" type="button" onClick={uploadDraft} disabled={busy}>
                  Upload
                </button>
                <button className="ghost" type="button" onClick={() => { closeDraft(); setPicker(draftStory?.kind === 'text' ? 'text' : 'choose'); }} disabled={busy}>
                  Back
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
      {current ? (
        <div className="story-view" role="dialog" aria-label={`${currentGroup.user.name} story`}>
          <button className="story-hit left" type="button" aria-label="Previous" onClick={() => advance(-1)} />
          <button className="story-hit right" type="button" aria-label="Next" onClick={() => advance(1)} />
          <div className={`story-frame ${currentGroup.mine ? '' : 'has-reply'}`} style={{ background: current.color || '#2a1d17' }}>
            {current.kind === 'image' ? <img src={mediaUrl(current.media)} alt="" /> : null}
            {current.kind === 'video' ? (
              <video key={current.id} src={mediaUrl(current.media)} autoPlay playsInline controls onEnded={() => advance(1)} />
            ) : null}
            {current.kind === 'audio' ? (
              <audio key={current.id} src={mediaUrl(current.media)} autoPlay controls onEnded={() => advance(1)} />
            ) : null}
            {current.text ? <p className={current.kind === 'text' ? 'story-words' : 'story-caption'}>{current.text}</p> : null}
            <div className="story-top">
              <span className="story-person">
                <Avatar name={currentGroup.user.name} color={currentGroup.user.color} avatar={currentGroup.user.avatar} size="sm" />
                <strong>{currentGroup.mine ? 'Your story' : currentGroup.user.name}</strong>
              </span>
              {currentGroup.mine ? (
                <button type="button" className="story-eye" onClick={() => setShowSeen((open) => !open)} aria-label="Who watched this story">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path fill="currentColor" d="M12 5c5 0 9.3 3.1 11 7-1.7 3.9-6 7-11 7S2.7 15.9 1 12c1.7-3.9 6-7 11-7zm0 2.2A4.8 4.8 0 1 0 12 16.8 4.8 4.8 0 0 0 12 7.2zm0 2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6z" />
                  </svg>
                  <span>{current.viewers?.length || 0}</span>
                </button>
              ) : null}
              <button type="button" onClick={() => setViewer(null)}>
                Close
              </button>
              {currentGroup.mine ? (
                <button type="button" onClick={removeCurrent}>
                  Delete
                </button>
              ) : null}
            </div>
            {current.reactions?.length ? (
              <p className="story-reacted">{current.reactions.map((item) => item.emoji).join(' ')}</p>
            ) : null}
            {currentGroup.mine ? null : (
              <div className="story-reply">
                <div className="story-reacts">
                  {storyEmojis.map((emoji) => (
                    <button key={emoji} type="button" onClick={() => reactToStory(emoji)} aria-label={`React ${emoji}`}>
                      {emoji}
                    </button>
                  ))}
                </div>
                <form onSubmit={sendReply}>
                  <input
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    placeholder={`Reply to ${currentGroup.user.name}`}
                    maxLength={300}
                    aria-label="Reply to story"
                  />
                  <button type="submit">Send</button>
                </form>
                {storyNote ? <p>{storyNote}</p> : null}
              </div>
            )}
          </div>
          {showSeen && currentGroup.mine ? (
            <ul className="seen-list">
              {current.viewers?.length ? current.viewers.map((person) => (
                <li key={person.id} className="seen-person">
                  <Avatar name={person.name} color={person.color} avatar={person.avatar} size="sm" />
                  <span>{person.name}</span>
                </li>
              )) : <li>No one has seen this yet.</li>}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
