import React, { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { api, getToken, getUser, clearSession } from './api';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import Subjects from './pages/Subjects';
import Assignments from './pages/Assignments';
import Exams from './pages/Exams';
import Notes from './pages/Notes';
import Focus from './pages/Focus';
import Quizzes from './pages/Quizzes';
import AttendancePage from './pages/AttendancePage';
import Requests from './pages/Requests';
import TeacherSubjects from './pages/TeacherSubjects';
import Admin from './pages/Admin';

const NAV_BY_ROLE = {
  student: [
    { to: '/app', label: 'Dashboard', end: true },
    { to: '/app/schedule', label: 'Schedule' },
    { to: '/app/subjects', label: 'Subjects & Slides' },
    { to: '/app/assignments', label: 'Assignments' },
    { to: '/app/exams', label: 'Exams' },
    { to: '/app/quizzes', label: 'Quizzes' },
    { to: '/app/attendance', label: 'Attendance' },
    { to: '/app/requests', label: 'Leave Applications' },
    { to: '/app/notes', label: 'Notes' },
    { to: '/app/focus', label: 'Focus Timer' },
  ],
  teacher: [
    { to: '/app/classes', label: 'My Classes' },
    { to: '/app/attendance', label: 'Attendance' },
    { to: '/app/quizzes', label: 'Quizzes' },
    { to: '/app/requests', label: 'Student Requests' },
  ],
  superadmin: [
    { to: '/app/admin', label: 'Admin Console' },
    { to: '/app/classes', label: 'My Classes' },
    { to: '/app/attendance', label: 'Attendance' },
    { to: '/app/quizzes', label: 'Quizzes' },
    { to: '/app/requests', label: 'Student Requests' },
  ],
};

function Shell({ theme, setTheme, children }) {
  const user = getUser();
  const role = user?.role || 'student';
  const navigate = useNavigate();
  const logout = async () => {
    try { await api('/auth/logout', { method: 'DELETE' }); } catch {}
    clearSession();
    navigate('/login');
  };
  const nav = NAV_BY_ROLE[role] || NAV_BY_ROLE.student;
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo"><span className="logo-mark">S</span> StudyFlow</div>
        <div style={{ padding: '0 10px 12px' }}>
          <span className="badge todo" style={{ textTransform: 'capitalize' }}>{role}</span>
        </div>
        <nav className="nav">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>{n.label}</NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="btn sm" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
          <div className="userbox">
            <div className="avatar">{(user?.name || '?')[0].toUpperCase()}</div>
            <div className="meta">
              <b>{user?.name}</b>
              <span>{user?.email}</span>
            </div>
          </div>
          <button className="btn sm" onClick={logout}>Log out</button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

function Protected({ theme, setTheme }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  const role = getUser()?.role || 'student';
  const home = role === 'superadmin' ? 'admin' : role === 'teacher' ? 'classes' : null;
  return (
    <Shell theme={theme} setTheme={setTheme}>
      <Routes>
        <Route index element={home ? <Navigate to={`/app/${home}`} replace /> : <Dashboard />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="subjects" element={<Subjects />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="exams" element={<Exams />} />
        <Route path="notes" element={<Notes />} />
        <Route path="focus" element={<Focus />} />
        <Route path="quizzes" element={<Quizzes />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="requests" element={<Requests />} />
        <Route path="classes" element={<TeacherSubjects />} />
        <Route path="admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
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
