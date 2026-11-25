import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('hearth_token');
    if (!saved) {
      setReady(true);
      return;
    }
    api('/api/auth/me', { token: saved })
      .then((data) => {
        setToken(saved);
        setUser(data.user);
      })
      .catch(() => localStorage.removeItem('hearth_token'))
      .finally(() => setReady(true));
  }, []);

  const value = useMemo(() => {
    function persist(data) {
      localStorage.setItem('hearth_token', data.token);
      setToken(data.token);
      setUser(data.user);
    }

    return {
      token,
      user,
      ready,
      async login(body) {
        persist(await api('/api/auth/login', { method: 'POST', body }));
      },
      async signup(body) {
        persist(await api('/api/auth/signup', { method: 'POST', body }));
      },
      logout() {
        localStorage.removeItem('hearth_token');
        setToken('');
        setUser(null);
      },
      async updateProfile(body) {
        const data = await api('/api/auth/me', { method: 'PATCH', token, body });
        persist(data);
        return data.user;
      },
      async updateStyle(body) {
        const data = await api('/api/auth/style', { method: 'POST', token, body });
        setUser(data.user);
        return data.user;
      }
    };
  }, [token, user, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
