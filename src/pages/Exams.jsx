import React, { useEffect, useState } from 'react';
import { api, fmtDateTime, daysUntil } from '../api';

export default function Exams() {
  const [items, setItems] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');

  const load = () => {
    api('/exams').then(setItems).catch(() => {});
    api('/subjects').then(setSubjects).catch(() => {});
  };
  useEffect(load, []);
  const notify = (m) => { setToast(m); setTimeout(() => setToast(''), 2200); };
  const sub = (id) => subjects.find((s) => s.id === id);

  const save = async (form) => {
    const body = {
      ...form,
      subjectId: form.subjectId ? +form.subjectId : null,
      date: form.date ? new Date(form.date).toISOString() : null,
    };
    if (form.id) await api(`/exams/${form.id}`, { method: 'PATCH', body });
    else await api('/exams', { method: 'POST', body });
    setModal(null); load(); notify('Exam saved');
  };
  const remove = async (id) => {
    await api(`/exams/${id}`, { method: 'DELETE' });
    setModal(null); load(); notify('Exam deleted');
  };

  const upcoming = items.filter((e) => !e.date || new Date(e.date) >= new Date());
  const past = items.filter((e) => e.date && new Date(e.date) < new Date());

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Exams</h1>
          <p>{upcoming.length} upcoming — stay ready, not scared.</p>
        </div>
        <button className="btn primary" onClick={() => setModal({})}>+ Add exam</button>
      </div>

      <div className="grid cols-3">
        {upcoming.length === 0 && <div className="empty card">No upcoming exams.</div>}
        {upcoming.map((e) => {
          const d = daysUntil(e.date);
          const s = sub(e.subjectId);
          return (
            <div className="card subject-card" key={e.id} style={{ borderTopColor: s?.color || 'var(--amber)' }}>
              <div className="code">{s?.name || 'GENERAL'}</div>
              <h4>{e.title}</h4>
              <div className="meta">
                <span>{fmtDateTime(e.date)}</span>
                {e.location && <span>{e.location}</span>}
                {e.notes && <span>{e.notes}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <span className={`badge ${d !== null && d <= 3 ? 'high' : 'medium'}`}>
                  {d === null ? 'TBD' : d === 0 ? 'TODAY!' : `${d} day${d === 1 ? '' : 's'} left`}
                </span>
                <button className="btn sm" style={{ marginLeft: 'auto' }}
                  onClick={() => setModal({ ...e, date: e.date ? e.date.slice(0, 16) : '' })}>Edit</button>
              </div>
            </div>
          );
        })}
      </div>

      {past.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <h3>Past exams</h3>
          <div className="list">
            {past.map((e) => (
              <div className="list-item" key={e.id}>
                <div className="grow">
                  <div className="title" style={{ opacity: .65 }}>{e.title}</div>
                  <div className="sub">{fmtDateTime(e.date)}</div>
                </div>
                <button className="btn sm ghost" onClick={() => remove(e.id)}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {modal && <ExamModal item={modal} subjects={subjects} onSave={save} onDelete={remove} onClose={() => setModal(null)} />}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

function ExamModal({ item, subjects, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({ title: '', location: '', notes: '', date: '', subjectId: '', ...item, subjectId: item.subjectId || '' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{form.id ? 'Edit exam' : 'Add exam'}</h2>
        <div className="field"><label>Title</label><input value={form.title} onChange={set('title')} placeholder="Midterm — Data Structures" /></div>
        <div className="form-row">
          <div className="field">
            <label>Subject</label>
            <select value={form.subjectId} onChange={set('subjectId')}>
              <option value="">General</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Date & time</label><input type="datetime-local" value={form.date} onChange={set('date')} /></div>
        </div>
        <div className="field"><label>Location</label><input value={form.location} onChange={set('location')} placeholder="Main Hall" /></div>
        <div className="field"><label>Syllabus / notes</label><textarea rows="3" value={form.notes} onChange={set('notes')} placeholder="Chapters covered, allowed materials…" /></div>
        <div className="modal-actions">
          {form.id && <button className="btn danger" onClick={() => onDelete(form.id)}>Delete</button>}
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => onSave(form)}>Save</button>
        </div>
      </div>
    </div>
  );
}
