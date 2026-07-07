import React, { useEffect, useState } from 'react';
import { api, fmtDate } from '../api';

export default function Notes() {
  const [items, setItems] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');
  const [q, setQ] = useState('');

  const load = () => {
    api('/notes').then(setItems).catch(() => {});
    api('/subjects').then(setSubjects).catch(() => {});
  };
  useEffect(load, []);
  const notify = (m) => { setToast(m); setTimeout(() => setToast(''), 2200); };
  const sub = (id) => subjects.find((s) => s.id === id);

  const save = async (form) => {
    const body = { ...form, subjectId: form.subjectId ? +form.subjectId : null };
    if (form.id) await api(`/notes/${form.id}`, { method: 'PATCH', body });
    else await api('/notes', { method: 'POST', body });
    setModal(null); load(); notify('Note saved ✓');
  };
  const remove = async (id) => {
    await api(`/notes/${id}`, { method: 'DELETE' });
    setModal(null); load(); notify('Note deleted');
  };
  const togglePin = async (n) => {
    await api(`/notes/${n.id}`, { method: 'PATCH', body: { pinned: !n.pinned } });
    load();
  };

  const shown = items.filter((n) =>
    !q || n.title.toLowerCase().includes(q.toLowerCase()) || n.content.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Notes</h1>
          <p>Quick notes, cheatsheets and reminders.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="🔍 Search notes…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 200 }} />
          <button className="btn primary" onClick={() => setModal({ pinned: false })}>+ New note</button>
        </div>
      </div>

      <div className="grid cols-3">
        {shown.length === 0 && <div className="empty card">No notes found.</div>}
        {shown.map((n) => {
          const s = sub(n.subjectId);
          return (
            <div className="card note-card" key={n.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {s && <span className="dot" style={{ background: s.color }} />}
                <b style={{ fontSize: 14, flex: 1 }}>{n.title}</b>
                <button className="btn sm ghost" title="Pin" style={{ color: n.pinned ? 'var(--amber)' : undefined }}
                  onClick={() => togglePin(n)}>📌</button>
              </div>
              <div className="content">{n.content}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{s?.name || 'General'} · {fmtDate(n.updatedAt)}</span>
                <button className="btn sm" style={{ marginLeft: 'auto' }} onClick={() => setModal({ ...n })}>Open</button>
              </div>
            </div>
          );
        })}
      </div>

      {modal && <NoteModal item={modal} subjects={subjects} onSave={save} onDelete={remove} onClose={() => setModal(null)} />}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

function NoteModal({ item, subjects, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({ title: '', content: '', subjectId: '', ...item, subjectId: item.subjectId || '' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <h2>{form.id ? 'Edit note' : 'New note'}</h2>
        <div className="field"><label>Title</label><input value={form.title} onChange={set('title')} placeholder="e.g. AVL Rotation Cheatsheet" /></div>
        <div className="field">
          <label>Subject</label>
          <select value={form.subjectId} onChange={set('subjectId')}>
            <option value="">General</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="field"><label>Content</label><textarea rows="10" value={form.content} onChange={set('content')} placeholder="Write anything…" /></div>
        <div className="modal-actions">
          {form.id && <button className="btn danger" onClick={() => onDelete(form.id)}>Delete</button>}
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => onSave(form)}>Save</button>
        </div>
      </div>
    </div>
  );
}
