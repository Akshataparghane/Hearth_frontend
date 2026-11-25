import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { api } from '../api';
import { AuthFrame } from '../components/AuthFrame';
import { PasswordField } from '../components/PasswordField';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice || '');
  const [busy, setBusy] = useState(false);
  const [memory, setMemory] = useState(false);

  useEffect(() => {
    api('/api/health')
      .then((data) => setMemory(data.db === 'memory'))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login({ email, password });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      title="Come in"
      lede="Pick up where the last episode left off."
      footer={
        <p className="swap">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      }
    >
      {notice ? (
        <div className="toasts">
          <p className="toast" role="status">
            {notice}
          </p>
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="stack">
        <label>
          Email or personal ID
          <input
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@email.com or user2"
            required
          />
        </label>
        <PasswordField
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <p className="swap">
          <Link to="/forgot">Forgot password</Link>
        </p>
        {memory ? (
          <p className="hint">
            This backend is using a temporary database. Restarting it deletes every account, and login then
            says the details are wrong. Sign up again after a restart.
          </p>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
        <button className="primary" type="submit" disabled={busy}>
          {busy ? 'Checking…' : 'Log in'}
        </button>
      </form>
    </AuthFrame>
  );
}
