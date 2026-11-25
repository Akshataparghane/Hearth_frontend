import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useAuth } from './context/AuthContext';
import { Forgot } from './pages/Forgot';
import { Friends } from './pages/Friends';
import { Chats } from './pages/Chats';
import { Lobby } from './pages/Lobby';
import { Login } from './pages/Login';
import { Profile } from './pages/Profile';
import { Room } from './pages/Room';
import { Signup } from './pages/Signup';

function RequireAuth() {
  const { user, ready } = useAuth();
  if (!ready) return <p className="center-note">Lighting the room…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot" element={<Forgot />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Lobby />} />
        <Route path="/chats" element={<Chats />} />
        <Route path="/chats/:id" element={<Chats />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/room/:id" element={<Room />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
