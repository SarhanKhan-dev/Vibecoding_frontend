import React, { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { getToken, getUser, clearSession } from './api';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import Subjects from './pages/Subjects';
import Assignments from './pages/Assignments';
import Exams from './pages/Exams';
import Notes from './pages/Notes';
import Focus from './pages/Focus';

const NAV = [
  { to: '/app', icon: '◧', label: 'Dashboard', end: true },
  { to: '/app/schedule', icon: '🗓', label: 'Schedule' },
  { to: '/app/subjects', icon: '📚', label: 'Subjects & Slides' },
  { to: '/app/assignments', icon: '✅', label: 'Assignments' },
  { to: '/app/exams', icon: '🎯', label: 'Exams' },
  { to: '/app/notes', icon: '📝', label: 'Notes' },
  { to: '/app/focus', icon: '⏱', label: 'Focus Timer' },
];

function Shell({ theme, setTheme, children }) {
  const user = getUser();
  const navigate = useNavigate();
  const logout = () => { clearSession(); navigate('/login'); };
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo"><span className="logo-mark">S</span> StudyFlow</div>
        <nav className="nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              <span className="icon">{n.icon}</span> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="btn sm" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? '🌙 Dark mode' : '☀️ Light mode'}
          </button>
          <div className="userbox">
            <div className="avatar">{(user?.name || '?')[0].toUpperCase()}</div>
            <div className="meta">
              <b>{user?.name}</b>
              <span>{user?.email}</span>
            </div>
          </div>
          <button className="btn sm" onClick={logout}>↩ Log out</button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

function Protected({ theme, setTheme }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return (
    <Shell theme={theme} setTheme={setTheme}>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="subjects" element={<Subjects />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="exams" element={<Exams />} />
        <Route path="notes" element={<Notes />} />
        <Route path="focus" element={<Focus />} />
      </Routes>
    </Shell>
  );
}

export default function App() {
  const [theme, setTheme] = useState(localStorage.getItem('sf_theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sf_theme', theme);
  }, [theme]);

  return (
    <Routes>
      <Route path="/" element={getToken() ? <Navigate to="/app" replace /> : <Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Login register />} />
      <Route path="/app/*" element={<Protected theme={theme} setTheme={setTheme} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
