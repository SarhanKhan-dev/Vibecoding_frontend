import React, { useEffect, useRef, useState } from 'react';
import { api, getUser, fileUrl, fmtDateTime } from '../api';

export default function Quizzes() {
  const role = getUser()?.role || 'student';
  return role === 'student' ? <StudentQuizzes /> : <TeacherQuizzes />;
}

/* ---------------- Student view ---------------- */
function StudentQuizzes() {
  const [items, setItems] = useState([]);
  const [retakes, setRetakes] = useState([]);
  const [modal, setModal] = useState(null); // quiz for retake request
  const [toast, setToast] = useState('');

  const load = () => {
    api('/quizzes').then(setItems).catch(() => {});
    api('/retakes').then(setRetakes).catch(() => {});
  };
  useEffect(load, []);
  const notify = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Quizzes</h1>
          <p>Your quizzes across all enrolled classes, with marks as teachers grade them.</p>
        </div>
      </div>

      <div className="grid cols-3">
        {items.length === 0 && <div className="empty card">No quizzes yet. You'll see them here once your teacher posts one.</div>}
        {items.map((q) => {
          const g = q.grade;
          const pct = g?.status === 'graded' ? Math.round((g.marks / q.totalMarks) * 100) : null;
          return (
            <div className="card subject-card" key={q.id} style={{ borderTopColor: q.subject?.color || 'var(--primary)' }}>
              <div className="code">{q.subject?.name || 'CLASS'}</div>
              <h4>{q.title}</h4>
              <div className="meta">
                <span>{fmtDateTime(q.date)}</span>
                {q.description && <span>{q.description}</span>}
                <span>Total marks: {q.totalMarks}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                {g?.status === 'graded' && <span className={`badge ${pct >= 70 ? 'done' : pct >= 50 ? 'medium' : 'high'}`}>{g.marks}/{q.totalMarks} ({pct}%)</span>}
                {g?.status === 'missed' && <span className="badge high">Missed</span>}
                {(!g || g.status === 'pending') && <span className="badge todo">Not graded yet</span>}
                {g?.status === 'missed' && !retakes.some((r) => r.quizId === q.id && r.status === 'pending') && (
                  <button className="btn sm primary" style={{ marginLeft: 'auto' }} onClick={() => setModal(q)}>Request retake</button>
                )}
                {retakes.some((r) => r.quizId === q.id && r.status === 'pending') && (
                  <span className="badge medium" style={{ marginLeft: 'auto' }}>Retake requested</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {retakes.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <h3>My retake requests</h3>
          <div className="list">
            {retakes.map((r) => (
              <div className="list-item" key={r.id}>
                <div className="grow">
                  <div className="title">{r.quiz?.title || 'Quiz'}</div>
                  <div className="sub">{r.reason}</div>
                </div>
                {r.filename && <a className="btn sm" href={fileUrl(r.filename)} target="_blank" rel="noreferrer">Document</a>}
                <span className={`badge ${r.status === 'approved' ? 'done' : r.status === 'rejected' ? 'high' : 'medium'}`}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {modal && <RetakeModal quiz={modal} onDone={(msg) => { setModal(null); load(); notify(msg); }} onClose={() => setModal(null)} />}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

function RetakeModal({ quiz, onDone, onClose }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const submit = async () => {
    if (!reason.trim()) { setError('Please explain why you missed the quiz.'); return; }
    setBusy(true); setError('');
    try {
      const fd = new FormData();
      fd.append('quizId', quiz.id);
      fd.append('reason', reason);
      if (fileRef.current.files[0]) fd.append('file', fileRef.current.files[0]);
      await api('/retakes', { method: 'POST', formData: fd });
      onDone('Retake request sent to your teacher');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Request retake — {quiz.title}</h2>
        {error && <div className="error-box">{error}</div>}
        <div className="field">
          <label>Why did you miss this quiz?</label>
          <textarea rows="4" value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. I was hospitalized that morning. Admission slip attached." />
        </div>
        <div className="field">
          <label>Supporting document (medical certificate, letter, etc.)</label>
          <input type="file" ref={fileRef} />
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy} onClick={submit}>{busy ? 'Sending…' : 'Submit request'}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Teacher view ---------------- */
function TeacherQuizzes() {
  const [items, setItems] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [postModal, setPostModal] = useState(false);
  const [gradeModal, setGradeModal] = useState(null); // quizId
  const [toast, setToast] = useState('');

  const load = () => {
    api('/quizzes').then(setItems).catch(() => {});
    api('/teacher/subjects').then(setSubjects).catch(() => {});
  };
  useEffect(load, []);
  const notify = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  const remove = async (id) => {
    await api(`/quizzes/${id}`, { method: 'DELETE' });
    load(); notify('Quiz deleted');
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Quizzes</h1>
          <p>Post quizzes for your classes and grade every student.</p>
        </div>
        <button className="btn primary" onClick={() => setPostModal(true)}>+ Post quiz</button>
      </div>

      <div className="grid cols-3">
        {items.length === 0 && <div className="empty card">No quizzes posted yet.</div>}
        {items.map((q) => (
          <div className="card subject-card" key={q.id} style={{ borderTopColor: q.subject?.color || 'var(--primary)' }}>
            <div className="code">{q.subject?.name || 'CLASS'}</div>
            <h4>{q.title}</h4>
            <div className="meta">
              <span>{fmtDateTime(q.date)}</span>
              {q.description && <span>{q.description}</span>}
              <span>Total marks: {q.totalMarks}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              <button className="btn sm primary" onClick={() => setGradeModal(q.id)}>Grade students</button>
              <button className="btn sm danger" onClick={() => remove(q.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {postModal && <PostQuizModal subjects={subjects} onDone={() => { setPostModal(false); load(); notify('Quiz posted'); }} onClose={() => setPostModal(false)} />}
      {gradeModal && <GradeModal quizId={gradeModal} onDone={() => { setGradeModal(null); notify('Grades saved'); }} onClose={() => setGradeModal(null)} />}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

function PostQuizModal({ subjects, onDone, onClose }) {
  const [form, setForm] = useState({ subjectId: subjects[0]?.id || '', title: '', description: '', totalMarks: 10, date: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    try {
      await api('/quizzes', { method: 'POST', body: { ...form, date: form.date ? new Date(form.date).toISOString() : null } });
      onDone();
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Post a quiz</h2>
        {error && <div className="error-box">{error}</div>}
        <div className="field">
          <label>Class</label>
          <select value={form.subjectId} onChange={set('subjectId')}>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
          </select>
        </div>
        <div className="field"><label>Title</label><input value={form.title} onChange={set('title')} placeholder="Quiz 3 - Hash Tables" /></div>
        <div className="field"><label>Description / syllabus</label><textarea rows="2" value={form.description} onChange={set('description')} /></div>
        <div className="form-row">
          <div className="field"><label>Total marks</label><input type="number" min="1" value={form.totalMarks} onChange={set('totalMarks')} /></div>
          <div className="field"><label>Date & time</label><input type="datetime-local" value={form.date} onChange={set('date')} /></div>
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={submit}>Post quiz</button>
        </div>
      </div>
    </div>
  );
}

function GradeModal({ quizId, onDone, onClose }) {
  const [sheet, setSheet] = useState(null);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/quizzes/${quizId}/grades`).then((d) => { setSheet(d); setRows(d.rows); }).catch(() => {});
  }, [quizId]);

  const setRow = (i, patch) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const save = async () => {
    setBusy(true);
    try {
      await api(`/quizzes/${quizId}/grades`, {
        method: 'POST',
        body: { grades: rows.map((r) => ({ studentId: r.student.id, marks: r.marks, status: r.status })) },
      });
      onDone();
    } finally { setBusy(false); }
  };

  if (!sheet) return null;
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
        <h2>Grade — {sheet.quiz.title} (out of {sheet.quiz.totalMarks})</h2>
        <div className="list">
          {rows.length === 0 && <div className="empty">No students enrolled in this class yet.</div>}
          {rows.map((r, i) => (
            <div className="list-item" key={r.student.id}>
              <div className="grow">
                <div className="title">{r.student.name}</div>
                <div className="sub">{r.student.email}</div>
              </div>
              <select style={{ width: 110 }} value={r.status} onChange={(e) => setRow(i, { status: e.target.value, marks: e.target.value === 'graded' ? r.marks : null })}>
                <option value="pending">Pending</option>
                <option value="graded">Graded</option>
                <option value="missed">Missed</option>
              </select>
              <input type="number" style={{ width: 80 }} min="0" max={sheet.quiz.totalMarks}
                disabled={r.status !== 'graded'} value={r.marks ?? ''} placeholder="—"
                onChange={(e) => setRow(i, { marks: e.target.value })} />
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save grades'}</button>
        </div>
      </div>
    </div>
  );
}
