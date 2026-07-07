import React, { useEffect, useRef, useState } from 'react';
import { api, getUser, fileUrl, fmtDateTime, daysUntil } from '../api';

export default function Classwork() {
  const role = getUser()?.role || 'student';
  return role === 'student' ? <StudentClasswork /> : <TeacherClasswork />;
}

/* ================= Student ================= */
function StudentClasswork() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(null);
  const [toast, setToast] = useState('');

  const load = () => api('/classwork').then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);
  const notify = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Digital Assignments</h1>
          <p>Submit your answers online — they're auto-checked against the teacher's answer key.</p>
        </div>
      </div>

      <div className="grid cols-3">
        {items.length === 0 && <div className="empty card">No assignments posted yet.</div>}
        {items.map((a) => {
          const d = daysUntil(a.dueDate);
          const sub = a.submission;
          return (
            <div className="card subject-card" key={a.id} style={{ borderTopColor: a.subject?.color || 'var(--primary)' }}>
              <div className="code">{a.subject?.name || 'CLASS'}</div>
              <h4>{a.title}</h4>
              <div className="meta">
                {a.description && <span>{a.description}</span>}
                <span>{a.questions.length} question{a.questions.length === 1 ? '' : 's'} · {a.questions.reduce((t, q) => t + q.marks, 0)} marks</span>
                {a.dueDate && <span>Due {fmtDateTime(a.dueDate)}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                {sub ? (
                  <span className={`badge ${sub.score / sub.maxScore >= 0.7 ? 'done' : sub.score / sub.maxScore >= 0.4 ? 'medium' : 'high'}`}>
                    Scored {sub.score}/{sub.maxScore}
                  </span>
                ) : d !== null && d < 0 ? (
                  <span className="badge high">Overdue</span>
                ) : (
                  <button className="btn sm primary" onClick={() => setOpen(a)}>Attempt now</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {open && <AttemptModal assignment={open} onDone={(msg) => { setOpen(null); load(); notify(msg); }} onClose={() => setOpen(null)} />}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

function AttemptModal({ assignment, onDone, onClose }) {
  const [answers, setAnswers] = useState(assignment.questions.map(() => ''));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef();

  const submit = async () => {
    if (answers.some((a) => !a.trim())) { setError('Please answer every question.'); return; }
    setBusy(true); setError('');
    try {
      const fd = new FormData();
      fd.append('answers', JSON.stringify(answers));
      if (fileRef.current.files[0]) fd.append('file', fileRef.current.files[0]);
      const res = await api(`/classwork/${assignment.id}/submit`, { method: 'POST', formData: fd });
      onDone(`Submitted — auto-graded ${res.score}/${res.maxScore}`);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
        <h2>{assignment.title}</h2>
        {assignment.description && <p className="sub" style={{ color: 'var(--muted)', marginBottom: 14, fontSize: 13 }}>{assignment.description}</p>}
        {error && <div className="error-box">{error}</div>}
        {assignment.questions.map((q, i) => (
          <div className="field" key={i}>
            <label>Q{i + 1}. {q.q} <span style={{ fontWeight: 400 }}>({q.marks} mark{q.marks === 1 ? '' : 's'})</span></label>
            <input value={answers[i]} onChange={(e) => setAnswers(answers.map((a, j) => (j === i ? e.target.value : a)))} placeholder="Your answer" />
          </div>
        ))}
        <div className="field">
          <label>Attach working file (optional)</label>
          <input type="file" ref={fileRef} />
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy} onClick={submit}>{busy ? 'Submitting…' : 'Submit & auto-grade'}</button>
        </div>
      </div>
    </div>
  );
}

/* ================= Teacher ================= */
function TeacherClasswork() {
  const [items, setItems] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [builder, setBuilder] = useState(false);
  const [subsModal, setSubsModal] = useState(null);
  const [toast, setToast] = useState('');

  const load = () => {
    api('/classwork').then(setItems).catch(() => {});
    api('/teacher/subjects').then(setSubjects).catch(() => {});
  };
  useEffect(load, []);
  const notify = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  const remove = async (id) => {
    await api(`/classwork/${id}`, { method: 'DELETE' });
    load(); notify('Assignment deleted');
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Digital Assignments</h1>
          <p>Post assignments with an answer key — submissions are auto-graded instantly.</p>
        </div>
        <button className="btn primary" onClick={() => setBuilder(true)}>+ Post assignment</button>
      </div>

      <div className="grid cols-3">
        {items.length === 0 && <div className="empty card">No digital assignments yet.</div>}
        {items.map((a) => (
          <div className="card subject-card" key={a.id} style={{ borderTopColor: a.subject?.color || 'var(--primary)' }}>
            <div className="code">{a.subject?.name || 'CLASS'}</div>
            <h4>{a.title}</h4>
            <div className="meta">
              <span>{a.questions.length} questions · {a.questions.reduce((t, q) => t + q.marks, 0)} marks</span>
              {a.dueDate && <span>Due {fmtDateTime(a.dueDate)}</span>}
              <span>{a.submissionCount} submission{a.submissionCount === 1 ? '' : 's'}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              <button className="btn sm primary" onClick={() => setSubsModal(a.id)}>Submissions</button>
              <button className="btn sm danger" onClick={() => remove(a.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {builder && <AssignmentBuilder subjects={subjects} onDone={() => { setBuilder(false); load(); notify('Assignment posted'); }} onClose={() => setBuilder(false)} />}
      {subsModal && <SubmissionsModal assignmentId={subsModal} onClose={() => setSubsModal(null)} notify={notify} />}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

function AssignmentBuilder({ subjects, onDone, onClose }) {
  const [form, setForm] = useState({ subjectId: subjects[0]?.id || '', title: '', description: '', dueDate: '' });
  const [questions, setQuestions] = useState([{ q: '', answer: '', marks: 1 }]);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setQ = (i, patch) => setQuestions(questions.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  const submit = async () => {
    const clean = questions.filter((q) => q.q.trim() && q.answer.trim());
    if (!form.title.trim() || !clean.length) { setError('Title and at least one question with its correct answer are required.'); return; }
    try {
      await api('/classwork', {
        method: 'POST',
        body: { ...form, dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null, questions: clean },
      });
      onDone();
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <h2>Post a digital assignment</h2>
        {error && <div className="error-box">{error}</div>}
        <div className="form-row">
          <div className="field">
            <label>Class</label>
            <select value={form.subjectId} onChange={set('subjectId')}>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </select>
          </div>
          <div className="field"><label>Due date</label><input type="datetime-local" value={form.dueDate} onChange={set('dueDate')} /></div>
        </div>
        <div className="field"><label>Title</label><input value={form.title} onChange={set('title')} placeholder="Worksheet 4 - Graphs" /></div>
        <div className="field"><label>Instructions</label><textarea rows="2" value={form.description} onChange={set('description')} placeholder="Answers are auto-checked — tell students the expected format." /></div>

        <label>Questions with answer key</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto', padding: '4px 2px' }}>
          {questions.map((q, i) => (
            <div key={i} className="card" style={{ padding: 12 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input value={q.q} onChange={(e) => setQ(i, { q: e.target.value })} placeholder={`Question ${i + 1}`} />
                <button className="btn sm ghost" onClick={() => setQuestions(questions.filter((_, j) => j !== i))}>×</button>
              </div>
              <div className="form-row">
                <input value={q.answer} onChange={(e) => setQ(i, { answer: e.target.value })} placeholder="Correct answer (exact match, case-insensitive)" />
                <input type="number" min="1" style={{ maxWidth: 90 }} value={q.marks} onChange={(e) => setQ(i, { marks: +e.target.value || 1 })} title="Marks" />
              </div>
            </div>
          ))}
        </div>
        <button className="btn sm" style={{ marginTop: 10 }} onClick={() => setQuestions([...questions, { q: '', answer: '', marks: 1 }])}>+ Add question</button>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={submit}>Post assignment</button>
        </div>
      </div>
    </div>
  );
}

function SubmissionsModal({ assignmentId, onClose, notify }) {
  const [data, setData] = useState(null);

  const load = () => api(`/classwork/${assignmentId}/submissions`).then(setData).catch(() => {});
  useEffect(() => { load(); }, [assignmentId]);

  const override = async (id) => {
    const score = prompt('New score:');
    if (score === null) return;
    await api(`/classwork/submissions/${id}`, { method: 'PATCH', body: { score: +score } });
    load(); notify('Score overridden');
  };

  if (!data) return null;
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
        <h2>Submissions — {data.assignment.title}</h2>
        <div className="list">
          {data.submissions.length === 0 && <div className="empty">No submissions yet.</div>}
          {data.submissions.map((s) => (
            <div className="list-item" key={s.id}>
              <div className="avatar">{s.student.name?.[0]?.toUpperCase()}</div>
              <div className="grow">
                <div className="title">{s.student.name} {s.status === 'overridden' && <span className="badge medium" style={{ marginLeft: 6 }}>overridden</span>}</div>
                <div className="sub">Answers: {s.answers.join(' · ')}</div>
              </div>
              {s.filename && <a className="btn sm" href={fileUrl(s.filename)} target="_blank" rel="noreferrer">File</a>}
              <span className={`badge ${s.score / s.maxScore >= 0.7 ? 'done' : 'medium'}`}>{s.score}/{s.maxScore}</span>
              <button className="btn sm" onClick={() => override(s.id)}>Edit</button>
            </div>
          ))}
        </div>
        <div className="modal-actions"><button className="btn" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}
