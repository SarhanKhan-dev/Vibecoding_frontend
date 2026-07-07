import React, { useEffect, useState } from 'react';
import { api, fmtDateTime, daysUntil } from '../api';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'todo', label: 'To do' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'done', label: 'Done' },
];

export default function Assignments() {
  const [items, setItems] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [tab, setTab] = useState('all');
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');

  const load = () => {
    api('/assignments').then(setItems).catch(() => {});
    api('/subjects').then(setSubjects).catch(() => {});
  };
  useEffect(load, []);
  const notify = (m) => { setToast(m); setTimeout(() => setToast(''), 2200); };
  const sub = (id) => subjects.find((s) => s.id === id);

  const save = async (form) => {
    const body = {
      ...form,
      subjectId: form.subjectId ? +form.subjectId : null,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
    };
    if (form.id) await api(`/assignments/${form.id}`, { method: 'PATCH', body });
    else await api('/assignments', { method: 'POST', body });
    setModal(null); load(); notify('Assignment saved');
  };
  const remove = async (id) => {
    await api(`/assignments/${id}`, { method: 'DELETE' });
    setModal(null); load(); notify('Assignment deleted');
  };
  const toggle = async (a) => {
    await api(`/assignments/${a.id}`, { method: 'PATCH', body: { status: a.status === 'done' ? 'todo' : 'done' } });
    load();
  };

  const shown = items.filter((a) => tab === 'all' || a.status === tab);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Assignments</h1>
          <p>{items.filter((a) => a.status !== 'done').length} pending · {items.filter((a) => a.status === 'done').length} completed</p>
        </div>
        <button className="btn primary" onClick={() => setModal({ priority: 'medium', status: 'todo' })}>+ New assignment</button>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? 'active' : ''} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      <div className="card">
        <div className="list">
          {shown.length === 0 && <div className="empty">Nothing here.</div>}
          {shown.map((a) => {
            const d = daysUntil(a.dueDate);
            const s = sub(a.subjectId);
            const overdue = a.status !== 'done' && d !== null && d < 0;
            return (
              <div className="list-item" key={a.id}>
                <input type="checkbox" className="checkbox" checked={a.status === 'done'} onChange={() => toggle(a)} />
                <div className="grow" style={{ cursor: 'pointer' }} onClick={() => setModal({ ...a, dueDate: a.dueDate ? a.dueDate.slice(0, 16) : '' })}>
                  <div className="title" style={{ textDecoration: a.status === 'done' ? 'line-through' : 'none', opacity: a.status === 'done' ? 0.6 : 1 }}>
                    {a.title}
                  </div>
                  <div className="sub">
                    {s && <><span className="dot" style={{ background: s.color, width: 7, height: 7, display: 'inline-block', marginRight: 4 }} />{s.name} · </>}
                    {a.dueDate ? <span style={{ color: overdue ? 'var(--red)' : 'inherit' }}>{overdue ? 'Overdue — ' : 'Due '}{fmtDateTime(a.dueDate)}</span> : 'No due date'}
                  </div>
                </div>
                <span className={`badge ${a.priority}`}>{a.priority}</span>
                <span className={`badge ${a.status}`}>{a.status.replace('_', ' ')}</span>
              </div>
            );
          })}
        </div>
      </div>

      {modal && <AssignmentModal item={modal} subjects={subjects} onSave={save} onDelete={remove} onClose={() => setModal(null)} />}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

function AssignmentModal({ item, subjects, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', ...item, subjectId: item.subjectId || '' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{form.id ? 'Edit assignment' : 'New assignment'}</h2>
        <div className="field"><label>Title</label><input value={form.title} onChange={set('title')} placeholder="e.g. Problem Set 4" /></div>
        <div className="field"><label>Description</label><textarea rows="3" value={form.description} onChange={set('description')} placeholder="Details, requirements…" /></div>
        <div className="form-row">
          <div className="field">
            <label>Subject</label>
            <select value={form.subjectId} onChange={set('subjectId')}>
              <option value="">General</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Due date</label><input type="datetime-local" value={form.dueDate} onChange={set('dueDate')} /></div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Priority</label>
            <select value={form.priority} onChange={set('priority')}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
          </div>
          <div className="field">
            <label>Status</label>
            <select value={form.status} onChange={set('status')}>
              <option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option>
            </select>
          </div>
        </div>
        <div className="modal-actions">
          {form.id && <button className="btn danger" onClick={() => onDelete(form.id)}>Delete</button>}
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => onSave(form)}>Save</button>
        </div>
      </div>
    </div>
  );
}
