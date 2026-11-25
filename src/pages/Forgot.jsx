import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { AuthFrame } from '../components/AuthFrame';
import { Icon } from '../components/Icon';
import { PasswordField } from '../components/PasswordField';

export function Forgot() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [note, setNote] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [wrongEmail, setWrongEmail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function sendCode(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setWrongEmail(false);
    try {
      const data = await api('/api/auth/forgot', { method: 'POST', body: { email } });
      setSent(true);
      setNote(data.message || 'We sent a 6-digit code to that email.');
    } catch (err) {
      if (err.message === 'Wrong email') setWrongEmail(true);
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('New password and confirmation do not match.');
      return;
    }
    setBusy(true);
    try {
      await api('/api/auth/reset', { method: 'POST', body: { email, code, password } });
      setDone(true);
      window.setTimeout(() => {
        navigate('/login', { replace: true, state: { notice: 'Password updated successfully' } });
      }, 900);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      title="Change password"
      lede="Enter your email and we will send a code."
      footer={
        <p className="swap">
          <Link to="/login">Back to login</Link>
        </p>
      }
    >
      {wrongEmail ? (
        <div className="story-pop" role="dialog" aria-label="Wrong email">
          <div className="story-sheet">
            <h2>Wrong email</h2>
            <p className="hint">No account uses that email.</p>
            <button className="primary" type="button" onClick={() => setWrongEmail(false)}>
              OK
            </button>
          </div>
        </div>
      ) : null}
      {done ? (
        <div className="toasts">
          <p className="toast" role="status">
            Password updated successfully
          </p>
        </div>
      ) : null}
      <form className="stack" onSubmit={sent ? changePassword : sendCode}>
        <label>
          <span className="field-label">
            <Icon name="mail" size={16} />
            Email
          </span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            readOnly={sent}
          />
        </label>
        {!sent ? (
          <button className="primary" type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Send OTP'}
          </button>
        ) : (
          <>
            <p className="hint">{note}</p>
            <label>
              <span className="field-label">
                <Icon name="id" size={16} />
                OTP
              </span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit code"
                required
              />
            </label>
            <PasswordField
              label="New password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
            />
            <PasswordField
              label="Confirm new password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              minLength={6}
            />
            <button className="primary" type="submit" disabled={busy}>
              {busy ? 'Updating…' : 'Change password'}
            </button>
          </>
        )}
        {error ? <p className="form-error">{error}</p> : null}
      </form>
    </AuthFrame>
  );
}
