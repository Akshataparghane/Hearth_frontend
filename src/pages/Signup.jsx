import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../api';
import { portraits } from '../avatars';
import { AvatarPicker, readProfilePhoto } from '../components/AvatarPicker';
import { AuthFrame } from '../components/AuthFrame';
import { PasswordField } from '../components/PasswordField';
import { useAuth } from '../context/AuthContext';

export function Signup() {
  const { user, signup } = useAuth();
  const [name, setName] = useState('');
  const [personalId, setPersonalId] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState('');
  const [avatar, setAvatar] = useState('');
  const [error, setError] = useState('');
  const [exists, setExists] = useState(false);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const usingPhoto = avatar.startsWith('data:');
  const character = portraits.find((item) => item.id === avatar);

  async function onPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    try {
      setAvatar(await readProfilePhoto(file));
    } catch (err) {
      setError(err.message);
    }
  }

  async function sendCode() {
    setError('');
    setExists(false);
    if (!email.trim()) {
      setError('Enter your email first.');
      return;
    }
    setBusy(true);
    try {
      await api('/api/auth/signup-code', { method: 'POST', body: { email } });
      setCodeSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    setExists(false);
    if (!codeSent || code.length !== 6) {
      setError('Verify your email with the 6-digit code first.');
      return;
    }
    if (!gender) {
      setError('Choose male, female, or other.');
      return;
    }
    if (!avatar) {
      setError('Choose a profile picture.');
      return;
    }
    setBusy(true);
    try {
      await signup({ name, personalId, email, phone, code, password, gender, avatar });
    } catch (err) {
      if (err.message === 'User already exist') setExists(true);
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      title="Save a seat"
      lede="Pick a personal ID. That is how friends find you."
      footer={
        <p className="swap">
          Already have a seat? <Link to="/login">Log in</Link>
        </p>
      }
    >
      {exists ? (
        <div className="story-pop" role="dialog" aria-label="User already exist">
          <div className="story-sheet">
            <h2>User already exist</h2>
            <p className="hint">That email and mobile number are already on an account.</p>
            <button className="primary" type="button" onClick={() => setExists(false)}>OK</button>
          </div>
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="stack">
        <label>
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            minLength={2}
            maxLength={40}
            required
          />
        </label>
        <label>
          Personal ID
          <input
            value={personalId}
            onChange={(event) => setPersonalId(event.target.value.toLowerCase().replace(/^@/, ''))}
            autoComplete="username"
            minLength={3}
            maxLength={20}
            pattern="[A-Za-z0-9_]{3,20}"
            placeholder="user2"
            required
          />
        </label>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setCodeSent(false);
              setCode('');
            }}
            required
          />
        </label>
        <div className="verify-row">
          <label>
            Email code
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit code"
            />
          </label>
          <button className="ghost" type="button" onClick={sendCode} disabled={busy}>
            {codeSent ? 'Resend code' : 'Send code'}
          </button>
        </div>
        {codeSent ? <p className="hint">Enter the code we sent to your email.</p> : null}
        <label>
          Mobile number
          <input
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="10-digit mobile number"
            required
          />
        </label>
        <PasswordField
          label="Password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={6}
        />
        <fieldset className="gender-picker">
          <legend>You are</legend>
          {[
            ['male', 'Male'],
            ['female', 'Female'],
            ['other', 'Other']
          ].map(([id, label]) => (
            <label key={id} className={gender === id ? 'kind on' : 'kind'}>
              <input type="radio" name="gender" value={id} checked={gender === id} onChange={() => setGender(id)} required />
              <strong>{label}</strong>
            </label>
          ))}
        </fieldset>
        <div>
          <p className="label">Profile picture</p>
          <p className="hint">Pick a character or upload a photo. One is enough.</p>
          {gender ? (
            <AvatarPicker
              gender={gender}
              value={usingPhoto ? '' : avatar}
              onChange={(id) => {
                setError('');
                setAvatar(id);
              }}
            />
          ) : (
            <p className="hint">Choose male, female, or other to see matching characters.</p>
          )}
          {usingPhoto ? (
            <div className="photo-chosen">
              <img src={avatar} alt="" />
              <p className="hint">Your photo is set. No character needed.</p>
            </div>
          ) : character ? (
            <p className="hint">{character.name} is set. No photo needed.</p>
          ) : null}
          <label className="photo-upload">
            {usingPhoto || character ? 'Use a photo instead' : 'Upload a photo instead'}
            <input type="file" accept="image/*" onChange={onPhoto} />
          </label>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="primary" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Create account'}
        </button>
      </form>
    </AuthFrame>
  );
}
