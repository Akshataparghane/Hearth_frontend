import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './Avatar';
import { Brand } from './AuthFrame';
import { Icon } from './Icon';
import { NoticeProvider, useNotices } from './Notices';

function FriendLink() {
  const { pending } = useNotices();
  return (
    <NavLink to="/friends" aria-label="Friends">
      <Icon name="friends" />
      <span className="nav-label">Friends</span>
      {pending > 0 ? <span className="badge">{pending}</span> : null}
    </NavLink>
  );
}

function ChatLink() {
  const { unreadChats } = useNotices();
  return (
    <NavLink to="/chats" aria-label="Chats">
      <Icon name="chat" />
      <span className="nav-label">Chats</span>
      {unreadChats > 0 ? <span className="badge">{unreadChats}</span> : null}
    </NavLink>
  );
}

export function Layout() {
  const { token, user, logout } = useAuth();
  const [memory, setMemory] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = user.theme === 'dark' ? 'dark' : 'bright';
  }, [user.theme]);

  useEffect(() => {
    api('/api/health')
      .then((data) => setMemory(data.db === 'memory'))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const apply = () => {
      const height = window.visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${Math.round(height)}px`);
    };
    apply();
    window.visualViewport?.addEventListener('resize', apply);
    window.addEventListener('resize', apply);
    return () => {
      window.visualViewport?.removeEventListener('resize', apply);
      window.removeEventListener('resize', apply);
    };
  }, []);

  return (
    <NoticeProvider token={token} userId={user.id}>
    <div className="shell">
      <header className="topbar">
        <Brand />
        <nav>
          <NavLink to="/" end aria-label="Rooms">
            <Icon name="rooms" />
            <span className="nav-label">Rooms</span>
          </NavLink>
          <ChatLink />
          <FriendLink />
        </nav>
        <div className="who">
          <NavLink to="/profile" className="avatar-link" aria-label="Open profile">
            <Avatar name={user.name} color={user.color} avatar={user.avatar} />
          </NavLink>
          <button className="ghost tiny" type="button" onClick={logout} aria-label="Log out">
            <Icon name="logout" />
            <span className="nav-label">Log out</span>
          </button>
        </div>
      </header>
      {memory && (
        <p className="banner">
          This server is using a temporary database. Accounts reset when it stops. Point MONGO_URI at
          MongoDB to keep them.
        </p>
      )}
      <div className="main-slot">
        <Outlet />
      </div>
    </div>
    </NoticeProvider>
  );
}
