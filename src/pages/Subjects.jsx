import React, { useEffect, useRef, useState } from 'react';
import { api, fileUrl, fmtSize, fmtDate } from '../api';
import { Donut, HBarChart } from '../components/Charts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444', '#14b8a6'];
const GRADE_POINTS = { 'A+': 4.0, A: 4.0, 'A-': 3.7, 'B+': 3.3, B: 3.0, 'B-': 2.7, 'C+': 2.3, C: 2.0, 'C-': 1.7, 'D+': 1.3, D: 1.0, F: 0 };
const GRADES = ['', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'];

export default function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [files, setFiles] = useState([]);
  const [gpa, setGpa] = useState(null);
  const [modal, setModal] = useState(null);
  const [openSubject, setOpenSubject] = useState(null);
  const [toast, setToast] = useState('');

  const load = () => {
    api('/subjects').then(setSubjects).catch(() => {});
    api('/files').then(setFiles).catch(() => {});
    api('/subjects/gpa').then(setGpa).catch(() => {});
  };
  useEffect(load, []);
  const notify = (m) => { setToast(m); setTimeout(() => setToast(''), 2200); };

  const save = async (form) => {
    const body = { ...form, credits: +form.credits || 0 };
    if (form.id) await api(`/subjects/${form.id}`, { method: 'PATCH', body });
    else await api('/subjects', { method: 'POST', body });
    setModal(null); load(); notify('Subject saved');
  };
  const remove = async (id) => {
    await api(`/subjects/${id}`, { method: 'DELETE' });
    setModal(null); setOpenSubject(null); load(); notify('Subject deleted');
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Subjects & Slides</h1>
          <p>
            {gpa?.gpa != null
              ? <>Current GPA: <b style={{ color: 'var(--primary)' }}>{gpa.gpa}</b> across {gpa.gradedCredits} graded credits</>
              : 'Add grades to your subjects to see your GPA.'}
          </p>
        </div>
        <button className="btn primary" onClick={() => setModal({ color: COLORS[subjects.length % COLORS.length], credits: 3, grade: '' })}>+ Add subject</button>
      </div>

      <div className="grid cols-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <h3>Grade points by subject</h3>
          {subjects.filter((s) => s.grade).length === 0
            ? <div className="empty">Add grades to subjects to see this chart.</div>
            : <HBarChart data={subjects.filter((s) => s.grade).map((s) => ({
                label: s.name, value: GRADE_POINTS[s.grade] ?? 0, color: s.color,
              }))} />}
        </div>
        <div className="card">
          <h3>Credits distribution</h3>
          <Donut data={subjects.map((s) => ({ label: s.code || s.name, value: s.credits, color: s.color }))} />
        </div>
      </div>

      <div className="grid cols-3">
        {subjects.length === 0 && <div className="empty card">No subjects yet — add your first one.</div>}
        {subjects.map((s) => {
          const count = files.filter((f) => f.subjectId === s.id).length;
          return (
            <div className="card subject-card" key={s.id} style={{ borderTopColor: s.color }}>
              <div className="code">{s.code || 'SUBJECT'}</div>
              <h4>{s.name}</h4>
              <div className="meta">
                {s.teacher && <span>{s.teacher}</span>}
                {s.room && <span>{s.room}</span>}
                <span>{s.credits} credits{s.grade ? ` · Grade: ${s.grade}` : ''}</span>
                <span>{count} file{count === 1 ? '' : 's'}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                <button className="btn sm primary" onClick={() => setOpenSubject(s)}>Slides</button>
                <button className="btn sm" onClick={() => setModal({ ...s })}>Edit</button>
              </div>
            </div>
          );
        })}
      </div>

      {modal && <SubjectModal subject={modal} onSave={save} onDelete={remove} onClose={() => setModal(null)} />}
      {openSubject && (
        <SlidesDrawer subject={openSubject} files={files.filter((f) => f.subjectId === openSubject.id)}
          onChange={load} onClose={() => setOpenSubject(null)} notify={notify} />
      )}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

function SubjectModal({ subject, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({ name: '', code: '', teacher: '', room: '', ...subject });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{form.id ? 'Edit subject' : 'Add subject'}</h2>
        <div className="field"><label>Name</label><input value={form.name} onChange={set('name')} placeholder="Data Structures" /></div>
        <div className="form-row">
          <div className="field"><label>Code</label><input value={form.code} onChange={set('code')} placeholder="CS-201" /></div>
          <div className="field"><label>Room</label><input value={form.room} onChange={set('room')} placeholder="B-104" /></div>
        </div>
        <div className="field"><label>Teacher</label><input value={form.teacher} onChange={set('teacher')} placeholder="Dr. Ahmed" /></div>
        <div className="form-row">
          <div className="field"><label>Credits</label><input type="number" min="0" max="10" value={form.credits} onChange={set('credits')} /></div>
          <div className="field">
            <label>Grade (for GPA)</label>
            <select value={form.grade} onChange={set('grade')}>
              {GRADES.map((g) => <option key={g} value={g}>{g || 'Not graded yet'}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Color</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {COLORS.map((c) => (
              <span key={c} onClick={() => setForm({ ...form, color: c })}
                style={{
                  width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer',
                  outline: form.color === c ? '2px solid var(--text)' : 'none', outlineOffset: 2,
                }} />
            ))}
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

function SlidesDrawer({ subject, files, onChange, onClose, notify }) {
  const fileRef = useRef();
  const [busy, setBusy] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('subjectId', subject.id);
      await api('/files/upload', { method: 'POST', formData: fd });
      onChange(); notify('Slide uploaded');
    } finally { setBusy(false); }
  };
  const remove = async (id) => {
    await api(`/files/${id}`, { method: 'DELETE' });
    onChange(); notify('File deleted');
  };
  const icon = (m) => m.includes('pdf') ? 'PDF' : m.includes('image') ? 'IMG' : m.includes('presentation') || m.includes('powerpoint') ? 'PPT' : 'FILE';

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <h2><span className="dot" style={{ background: subject.color, marginRight: 6 }} />{subject.name} — Slides & materials</h2>
        <input type="file" ref={fileRef} hidden onChange={(e) => upload(e.target.files[0])} />
        <div className="upload-zone" onClick={() => fileRef.current.click()}>
          {busy ? 'Uploading…' : 'Click to upload slides, PDFs, images or any lecture material'}
        </div>
        <div className="list" style={{ marginTop: 12 }}>
          {files.length === 0 && <div className="empty">No materials yet for this subject.</div>}
          {files.map((f) => (
            <div className="list-item" key={f.id}>
              <div className="file-ico">{icon(f.mimetype)}</div>
              <div className="grow">
                <div className="title">{f.originalName}</div>
                <div className="sub">{fmtSize(f.size)} · {fmtDate(f.uploadedAt)}</div>
              </div>
              <a className="btn sm" href={fileUrl(f.filename)} target="_blank" rel="noreferrer">Open</a>
              <button className="btn sm ghost" onClick={() => remove(f.id)}>×</button>
            </div>
          ))}
        </div>
        <div className="modal-actions"><button className="btn" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}