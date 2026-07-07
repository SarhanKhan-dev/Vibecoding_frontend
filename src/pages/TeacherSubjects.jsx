import React, { useEffect, useState } from 'react';
import { api } from '../api';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444', '#14b8a6'];

export default function TeacherSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [createModal, setCreateModal] = useState(false);
  const [openSubject, setOpenSubject] = useState(null);
  const [toast, setToast] = useState('');

  const load = () => api('/teacher/subjects').then(setSubjects).catch(() => {});
  useEffect(() => { load(); }, []);
  const notify = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>My Classes</h1>
          <p>The subjects you teach and the students enrolled in each.</p>
        </div>
        <button className="btn primary" onClick={() => setCreateModal(true)}>+ New class</button>
      </div>

      <div className="grid cols-3">
        {subjects.length === 0 && <div className="empty card">No classes yet — create your first one.</div>}
        {subjects.map((s) => (
          <div className="card subject-card" key={s.id} style={{ borderTopColor: s.color }}>
            <div className="code">{s.code || 'CLASS'}</div>
            <h4>{s.name}</h4>
            <div className="meta">
              {s.room && <span>Room: {s.room}</span>}
              <span>{s.credits} credits</span>
              <span>{s.studentCount} student{s.studentCount === 1 ? '' : 's'} enrolled</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              <button className="btn sm primary" onClick={() => setOpenSubject(s)}>Manage students</button>
            </div>
          </div>
        ))}
      </div>

      {createModal && <CreateModal onDone={() => { setCreateModal(false); load(); notify('Class created'); }} onClose={() => setCreateModal(false)} />}
      {openSubject && <StudentsModal subject={openSubject} onChange={load} onClose={() => setOpenSubject(null)} notify={notify} />}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

function CreateModal({ onDone, onClose }) {
  const [form, setForm] = useState({ name: '', code: '', room: '', credits: 3, color: COLORS[0] });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    try {
      await api('/teacher/subjects', { method: 'POST', body: { ...form, credits: +form.credits || 3 } });
      onDone();
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Create a class</h2>
        {error && <div className="error-box">{error}</div>}
        <div className="field"><label>Name</label><input value={form.name} onChange={set('name')} placeholder="Data Structures" /></div>
        <div className="form-row">
          <div className="field"><label>Code</label><input value={form.code} onChange={set('code')} placeholder="CS-201" /></div>
          <div className="field"><label>Room</label><input value={form.room} onChange={set('room')} placeholder="B-104" /></div>
        </div>
        <div className="form-row">
          <div className="field"><label>Credits</label><input type="number" min="1" max="10" value={form.credits} onChange={set('credits')} /></div>
          <div className="field">
            <label>Color</label>
            <div style={{ display: 'flex', gap: 8, paddingTop: 6 }}>
              {COLORS.map((c) => (
                <span key={c} onClick={() => setForm({ ...form, color: c })}
                  style={{ width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer', outline: form.color === c ? '2px solid var(--text)' : 'none', outlineOffset: 2 }} />
              ))}
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={submit}>Create</button>
        </div>
      </div>
    </div>
  );
}

function StudentsModal({ subject, onChange, onClose, notify }) {
  const [students, setStudents] = useState([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const load = () => api(`/teacher/subjects/${subject.id}/students`).then(setStudents).catch(() => {});
  useEffect(() => { load(); }, [subject.id]);

  const add = async () => {
    setError('');
    try {
      await api(`/teacher/subjects/${subject.id}/students`, { method: 'POST', body: { email } });
      setEmail(''); load(); onChange(); notify('Student enrolled');
    } catch (e) { setError(e.message); }
  };
  const remove = async (id) => {
    await api(`/teacher/subjects/${subject.id}/students/${id}`, { method: 'DELETE' });
    load(); onChange(); notify('Student removed');
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
        <h2><span className="dot" style={{ background: subject.color, marginRight: 6 }} />{subject.name} — Students</h2>
        {error && <div className="error-box">{error}</div>}
        <div className="form-row" style={{ marginBottom: 12 }}>
          <input placeholder="student email, e.g. ali@student.com" value={email} onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()} />
          <button className="btn primary" style={{ flex: '0 0 auto' }} onClick={add}>Enroll</button>
        </div>
        <div className="list">
          {students.length === 0 && <div className="empty">No students enrolled yet. Add them by email.</div>}
          {students.map((s) => (
            <div className="list-item" key={s.id}>
              <div className="avatar">{s.name[0]?.toUpperCase()}</div>
              <div className="grow">
                <div className="title">{s.name}</div>
                <div className="sub">{s.email}{s.major ? ` · ${s.major}` : ''}</div>
              </div>
              <button className="btn sm ghost" onClick={() => remove(s.id)}>×</button>
            </div>
          ))}
        </div>
        <div className="modal-actions"><button className="btn" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}
