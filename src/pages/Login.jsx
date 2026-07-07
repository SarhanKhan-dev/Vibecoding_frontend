import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setSession } from '../api';

export default function Login({ register = false }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', university: '', major: '', role: 'student' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const data = await api(register ? '/auth/register' : '/auth/login', { method: 'POST', body: form });
      setSession(data.token, data.user);
      navigate('/app');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const fillDemo = () => setForm({ ...form, email: 'demo@student.com', password: 'demo123' });

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="logo" style={{ justifyContent: 'center', marginBottom: 14 }}>
          <span className="logo-mark">S</span> StudyFlow
        </div>
        <div className="card">
          <h1>{register ? 'Create your account' : 'Welcome back'}</h1>
          <p className="sub">{register ? 'Set up your academic workspace in seconds.' : 'Log in to your academic workspace.'}</p>
          {error && <div className="error-box">{error}</div>}
          <form onSubmit={submit}>
            {register && (
              <div className="field">
                <label>I am a</label>
                <div className="tabs" style={{ marginBottom: 0 }}>
                  <button type="button" className={form.role === 'student' ? 'active' : ''} onClick={() => setForm({ ...form, role: 'student' })}>Student</button>
                  <button type="button" className={form.role === 'teacher' ? 'active' : ''} onClick={() => setForm({ ...form, role: 'teacher' })}>Teacher</button>
                </div>
              </div>
            )}
            {register && (
              <div className="field">
                <label>Full name</label>
                <input value={form.name} onChange={set('name')} placeholder="Alex Student" required />
              </div>
            )}
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={set('email')} placeholder="you@university.edu" required />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required />
            </div>
            {register && (
              <div className="form-row">
                <div className="field">
                  <label>University</label>
                  <input value={form.university} onChange={set('university')} placeholder="Optional" />
                </div>
                <div className="field">
                  <label>Major</label>
                  <input value={form.major} onChange={set('major')} placeholder="Optional" />
                </div>
              </div>
            )}
            <button className="btn primary" style={{ width: '100%', justifyContent: 'center', marginTop: 6 }} disabled={busy}>
              {busy ? 'Please wait…' : register ? 'Create account' : 'Log in'}
            </button>
          </form>
          {!register && (
            <>
              <div className="demo-hint" onClick={fillDemo}>
                Student: demo@student.com / demo123 — click to fill
              </div>
              <div className="demo-hint" onClick={() => setForm({ ...form, email: 'teacher@studyflow.com', password: 'teacher123' })}>
                Teacher: teacher@studyflow.com / teacher123 — click to fill
              </div>
              <div className="demo-hint" onClick={() => setForm({ ...form, email: 'admin@studyflow.com', password: 'admin123' })}>
                Superadmin: admin@studyflow.com / admin123 — click to fill
              </div>
            </>
          )}
          <div className="auth-switch">
            {register ? <>Already have an account? <Link to="/login">Log in</Link></>
              : <>New here? <Link to="/register">Create an account</Link></>}
          </div>
        </div>
      </div>
    </div>
  );
}
