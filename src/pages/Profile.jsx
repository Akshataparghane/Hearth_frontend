import { useEffect, useState } from 'react';
import { api } from '../api';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { useAuth } from '../context/AuthContext';

function photoData(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const size = 192;
      const scale = Math.min(1, size / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.72));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That photo could not be used.'));
    };
    image.src = url;
  });
}

export function Profile() {
  const { user, token, updateProfile, updateStyle } = useAuth();
  const [name, setName] = useState(user.name || '');
  const [personalId, setPersonalId] = useState(user.personalId || '');
  const [email, setEmail] = useState(user.email || '');
  const [error, setError] = useState('');
  const [styleError, setStyleError] = useState('');
  const [friends, setFriends] = useState([]);
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/api/friends', { token })
      .then((data) => setFriends(data.friends || []))
      .catch(() => {});
  }, [token]);

  function savePrivacy(storyPrivacy, storyAudience = user.storyAudience || []) {
    setStyleError('');
    updateStyle({ storyPrivacy, storyAudience }).catch((err) => setStyleError(err.message));
  }

  async function onPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setSaved('');
    setBusy(true);
    try {
      const dataUrl = await photoData(file);
      if (!dataUrl || dataUrl.length > 120000) {
        setError('Choose a smaller photo.');
        return;
      }
      await updateProfile({ name: name || user.name, personalId, email, avatar: dataUrl });
      setSaved('Photo updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    setSaved('');
    setBusy(true);
    try {
      await updateProfile({ name, personalId, email });
      setSaved('Profile saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page narrow">
      <header className="page-head">
        <div className="profile-title">
          <Avatar name={name || user.name} color={user.color} avatar={user.avatar} size="lg" />
          <div>
            <p className="eyebrow">Profile</p>
            <h1>{name || user.name}</h1>
          </div>
        </div>
      </header>

      <form className="panel stack" onSubmit={onSubmit}>
        <div>
          <h2>Edit profile</h2>
          <p className="hint">Change your name, user ID, email, or profile photo.</p>
        </div>
        <div className="profile-photo">
          <Avatar name={name || user.name} color={user.color} avatar={user.avatar} size="lg" />
          <label className="photo-upload">
            Upload new photo
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhoto} disabled={busy} />
          </label>
        </div>
        <label>
          <span className="field-label">
            <Icon name="user" size={16} />
            Name
          </span>
          <input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={40} required />
        </label>
        <label>
          <span className="field-label">
            <Icon name="id" size={16} />
            User ID
          </span>
          <input
            value={personalId}
            onChange={(event) => setPersonalId(event.target.value.toLowerCase().replace(/^@/, ''))}
            minLength={3}
            maxLength={20}
            pattern="[A-Za-z0-9_]{3,20}"
            required
          />
        </label>
        <label>
          <span className="field-label">
            <Icon name="mail" size={16} />
            Email
          </span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>

        {error ? <p className="form-error">{error}</p> : null}
        {saved ? <p className="form-ok">{saved}</p> : null}
        <button className="primary" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save profile'}
        </button>
      </form>

      <section className="panel stack settings" id="settings">
        <div>
          <h2>Story privacy</h2>
          <p className="hint">Choose who can see your stories.</p>
        </div>
        <div className="privacy-choices">
          {[
            ['friends', 'All friends'],
            ['selected', 'Only selected friends'],
            ['only', 'Only me']
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={(user.storyPrivacy || 'friends') === value ? 'primary tiny' : 'ghost tiny'}
              onClick={() => savePrivacy(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {(user.storyPrivacy || 'friends') === 'selected' ? (
          <div className="audience">
            {friends.length === 0 ? <p className="hint">Add a friend first.</p> : null}
            {friends.map((friend) => {
              const on = (user.storyAudience || []).includes(friend.id);
              return (
                <label key={friend.id} className="audience-row">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => {
                      const next = on
                        ? (user.storyAudience || []).filter((item) => item !== friend.id)
                        : [...(user.storyAudience || []), friend.id];
                      savePrivacy('selected', next);
                    }}
                  />
                  {friend.name}
                </label>
              );
            })}
          </div>
        ) : null}
        {styleError ? <p className="form-error">{styleError}</p> : null}
      </section>
    </div>
  );
}
