import React, { useEffect, useRef, useState } from 'react';
import { api, getUser, fileUrl, fmtDateTime } from '../api';
import QuizPlayer from '../components/QuizPlayer';

export default function Quizzes() {
  const role = getUser()?.role || 'student';
  return role === 'student' ? <StudentQuizzes /> : <TeacherQuizzes />;
}

const windowState = (q) => {
  const now = new Date();
  if (!q.startAt) return 'unscheduled';
  if (now < new Date(q.startAt)) return 'upcoming';
  if (q.endAt && now > new Date(q.endAt)) return 'ended';
  return 'live';
};

/* ================= Student ================= */
function StudentQuizzes() {
  const [online, setOnline] = useState([]);
  const [items, setItems] = useState([]);
  const [retakes, setRetakes] = useState([]);
  const [playing, setPlaying] = useState(null); // quizId
  const [modal, setModal] = useState(null);     // retake quiz
  const [toast, setToast] = useState('');

  const load = () => {
    api('/online/available').then(setOnline).catch(() => {});
    api('/quizzes').then((q) => setItems(q.filter((x) => x.kind === 'manual' || !x.kind))).catch(() => {});
    api('/retakes').then(setRetakes).catch(() => {});
  };
  useEffect(load, []);
  const notify = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Quizzes & Exams</h1>
          <p>Timed online quizzes, scheduled exams and your graded results.</p>
        </div>
      </div>

      <h3 style={{ margin: '4px 0 12px', fontSize: 14 }}>Online quizzes & exams</h3>
      <div className="grid cols-3" style={{ marginBottom: 24 }}>
        {online.length === 0 && <div className="empty card">No online quizzes yet.</div>}
        {online.map((q) => {
          const state = windowState(q);
          const done = q.attempt?.status === 'finished';
          return (
            <div className="card subject-card" key={q.id} style={{ borderTopColor: q.subject?.color || 'var(--primary)' }}>
              <div className="code">{q.subject?.name} · {q.kind === 'exam' ? 'EXAM' : 'ONLINE QUIZ'}</div>
              <h4>{q.title}</h4>
              <div className="meta">
                <span>{q.questionsPerStudent || '?'} questions · {q.secondsPerQuestion}s each</span>
                <span>{q.kind === 'exam' ? 'Randomized set per student' : q.description}</span>
                {q.startAt
                  ? <span>Window: {fmtDateTime(q.startAt)} → {fmtDateTime(q.endAt)}</span>
                  : <span>Awaiting schedule from administration</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                {done && <span className="badge done">Score: {q.attempt.score}/{q.attempt.questionIds.length}</span>}
                {!done && state === 'live' && <button className="btn sm primary" onClick={() => setPlaying(q.id)}>{q.attempt ? 'Resume' : 'Start now'}</button>}
                {!done && state === 'upcoming' && <span className="badge medium">Starts {fmtDateTime(q.startAt)}</span>}
                {!done && state === 'ended' && <span className="badge high">Window closed</span>}
                {!done && state === 'unscheduled' && <span className="badge todo">Not scheduled yet</span>}
              </div>
            </div>
          );
        })}
      </div>

      <h3 style={{ margin: '4px 0 12px', fontSize: 14 }}>Classroom quizzes (graded by teacher)</h3>
      <div className="grid cols-3">
        {items.length === 0 && <div className="empty card">No classroom quizzes yet.</div>}
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

      {playing && <QuizPlayer quizId={playing} onExit={() => { setPlaying(null); load(); }} />}
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
          <label>Supporting document</label>
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

/* ================= Teacher ================= */
function TeacherQuizzes() {
  const [onlineItems, setOnlineItems] = useState([]);
  const [items, setItems] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [builder, setBuilder] = useState(null);   // 'online' | 'exam'
  const [postModal, setPostModal] = useState(false);
  const [gradeModal, setGradeModal] = useState(null);
  const [resultsModal, setResultsModal] = useState(null);
  const [toast, setToast] = useState('');
  const refInput = useRef();
  const [refTarget, setRefTarget] = useState(null);

  const load = () => {
    api('/online/mine').then(setOnlineItems).catch(() => {});
    api('/quizzes').then((q) => setItems(q.filter((x) => x.kind === 'manual' || !x.kind))).catch(() => {});
    api('/teacher/subjects').then(setSubjects).catch(() => {});
  };
  useEffect(load, []);
  const notify = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  const uploadRef = async (file) => {
    if (!file || !refTarget) return;
    const fd = new FormData();
    fd.append('file', file);
    await api(`/online/${refTarget}/reference`, { method: 'POST', formData: fd });
    load(); notify('Reference PDF attached (visible only to you)');
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Quizzes & Exams</h1>
          <p>Run timed online quizzes, submit exams for scheduling, and grade classwork.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => setPostModal(true)}>+ Classroom quiz</button>
          <button className="btn" onClick={() => setBuilder('exam')}>+ Exam (MCQ bank)</button>
          <button className="btn primary" onClick={() => setBuilder('online')}>+ Online quiz</button>
        </div>
      </div>

      <input type="file" hidden ref={refInput} accept=".pdf" onChange={(e) => uploadRef(e.target.files[0])} />

      <h3 style={{ margin: '4px 0 12px', fontSize: 14 }}>Online quizzes & exams</h3>
      <div className="grid cols-3" style={{ marginBottom: 24 }}>
        {onlineItems.length === 0 && <div className="empty card">Create your first online quiz or exam.</div>}
        {onlineItems.map((q) => {
          const state = windowState(q);
          return (
            <div className="card subject-card" key={q.id} style={{ borderTopColor: q.subject?.color || 'var(--primary)' }}>
              <div className="code">{q.subject?.name} · {q.kind === 'exam' ? 'EXAM' : 'ONLINE QUIZ'}</div>
              <h4>{q.title}</h4>
              <div className="meta">
                <span>{q.questionCount} questions in bank · {q.questionsPerStudent} per student · {q.secondsPerQuestion}s each</span>
                {q.startAt
                  ? <span>Window: {fmtDateTime(q.startAt)} → {fmtDateTime(q.endAt)}</span>
                  : <span style={{ color: 'var(--amber)' }}>{q.kind === 'exam' ? 'Waiting for superadmin to schedule' : 'No window set'}</span>}
                <span>{q.attemptCount} attempt{q.attemptCount === 1 ? '' : 's'} completed</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                <span className={`badge ${state === 'live' ? 'done' : state === 'upcoming' ? 'medium' : state === 'ended' ? 'high' : 'todo'}`}>{state}</span>
                <button className="btn sm" style={{ marginLeft: 'auto' }} onClick={() => setResultsModal(q.id)}>Results</button>
                {q.refFilename
                  ? <a className="btn sm" href={fileUrl(q.refFilename)} target="_blank" rel="noreferrer">Ref PDF</a>
                  : <button className="btn sm" onClick={() => { setRefTarget(q.id); refInput.current.click(); }}>Attach PDF</button>}
              </div>
            </div>
          );
        })}
      </div>

      <h3 style={{ margin: '4px 0 12px', fontSize: 14 }}>Classroom quizzes (manual grading)</h3>
      <div className="grid cols-3">
        {items.length === 0 && <div className="empty card">No classroom quizzes.</div>}
        {items.map((q) => (
          <div className="card subject-card" key={q.id} style={{ borderTopColor: q.subject?.color || 'var(--primary)' }}>
            <div className="code">{q.subject?.name || 'CLASS'}</div>
            <h4>{q.title}</h4>
            <div className="meta">
              <span>{fmtDateTime(q.date)}</span>
              <span>Total marks: {q.totalMarks}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              <button className="btn sm primary" onClick={() => setGradeModal(q.id)}>Grade students</button>
            </div>
          </div>
        ))}
      </div>

      {builder && <BuilderModal kind={builder} subjects={subjects} onDone={() => { setBuilder(null); load(); notify(builder === 'exam' ? 'Exam submitted — superadmin will schedule it' : 'Online quiz created'); }} onClose={() => setBuilder(null)} />}
      {postModal && <PostQuizModal subjects={subjects} onDone={() => { setPostModal(false); load(); notify('Quiz posted'); }} onClose={() => setPostModal(false)} />}
      {gradeModal && <GradeModal quizId={gradeModal} onDone={() => { setGradeModal(null); notify('Grades saved'); }} onClose={() => setGradeModal(null)} />}
      {resultsModal && <ResultsModal quizId={resultsModal} onClose={() => setResultsModal(null)} />}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

const EMPTY_Q = () => ({ text: '', options: ['', '', '', ''], correct: 0 });

function BuilderModal({ kind, subjects, onDone, onClose }) {
  const [form, setForm] = useState({
    subjectId: subjects[0]?.id || '', title: '', description: '',
    secondsPerQuestion: 60, questionsPerStudent: '', startAt: '', endAt: '',
    category: kind === 'exam' ? 'final' : 'quiz',
  });
  const [questions, setQuestions] = useState([EMPTY_Q()]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setQ = (i, patch) => setQuestions(questions.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const setOpt = (i, oi, val) => setQ(i, { options: questions[i].options.map((o, k) => (k === oi ? val : o)) });

  const submit = async () => {
    setError('');
    const clean = questions.filter((q) => q.text.trim() && q.options.filter((o) => o.trim()).length >= 2);
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!clean.length) { setError('Add at least one complete question (text + 2 options).'); return; }
    setBusy(true);
    try {
      await api('/online', {
        method: 'POST',
        body: {
          ...form, kind,
          questionsPerStudent: +form.questionsPerStudent || clean.length,
          secondsPerQuestion: +form.secondsPerQuestion || 60,
          startAt: kind === 'online' && form.startAt ? new Date(form.startAt).toISOString() : null,
          endAt: kind === 'online' && form.endAt ? new Date(form.endAt).toISOString() : null,
          questions: clean.map((q) => ({ text: q.text, options: q.options.filter((o) => o.trim()), correct: +q.correct })),
        },
      });
      onDone();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
        <h2>{kind === 'exam' ? 'Create exam (MCQ bank)' : 'Create online quiz'}</h2>
        {kind === 'exam' && (
          <div className="demo-hint" style={{ marginTop: 0, marginBottom: 12, cursor: 'default' }}>
            Upload your full MCQ bank — each student automatically receives a different randomized set,
            1 minute per question. The superadmin sets the exam date & time.
          </div>
        )}
        {error && <div className="error-box">{error}</div>}
        <div className="form-row">
          <div className="field">
            <label>Class</label>
            <select value={form.subjectId} onChange={set('subjectId')}>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </select>
          </div>
          <div className="field"><label>Title</label><input value={form.title} onChange={set('title')} placeholder={kind === 'exam' ? 'Final Exam' : 'Online Quiz 1'} /></div>
        </div>
        <div className="form-row">
          <div className="field"><label>Seconds per question</label><input type="number" min="10" value={form.secondsPerQuestion} onChange={set('secondsPerQuestion')} /></div>
          <div className="field"><label>Questions per student (blank = all)</label><input type="number" min="1" value={form.questionsPerStudent} onChange={set('questionsPerStudent')} placeholder={String(questions.length)} /></div>
          <div className="field">
            <label>Counts toward</label>
            <select value={form.category} onChange={set('category')}>
              <option value="quiz">Quizzes</option>
              <option value="assignment">Assignments</option>
              <option value="mid">Midterm</option>
              <option value="final">Final</option>
              <option value="presentation">Presentation</option>
            </select>
          </div>
        </div>
        {kind === 'online' && (
          <div className="form-row">
            <div className="field"><label>Opens at</label><input type="datetime-local" value={form.startAt} onChange={set('startAt')} /></div>
            <div className="field"><label>Closes at</label><input type="datetime-local" value={form.endAt} onChange={set('endAt')} /></div>
          </div>
        )}

        <label style={{ marginTop: 6 }}>Questions ({questions.length})</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 320, overflowY: 'auto', padding: '4px 2px' }}>
          {questions.map((q, i) => (
            <div key={i} className="card" style={{ padding: 12 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input value={q.text} onChange={(e) => setQ(i, { text: e.target.value })} placeholder={`Question ${i + 1}`} />
                <button className="btn sm ghost" onClick={() => setQuestions(questions.filter((_, j) => j !== i))}>×</button>
              </div>
              {q.options.map((o, oi) => (
                <div key={oi} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <input type="radio" className="checkbox" style={{ width: 15, height: 15 }} name={`correct-${i}`}
                    checked={+q.correct === oi} onChange={() => setQ(i, { correct: oi })} title="Mark as correct" />
                  <input value={o} onChange={(e) => setOpt(i, oi, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + oi)}`} />
                </div>
              ))}
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Select the radio next to the correct option.</div>
            </div>
          ))}
        </div>
        <button className="btn sm" style={{ marginTop: 10 }} onClick={() => setQuestions([...questions, EMPTY_Q()])}>+ Add question</button>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy} onClick={submit}>
            {busy ? 'Saving…' : kind === 'exam' ? 'Submit exam for scheduling' : 'Create quiz'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultsModal({ quizId, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => { api(`/online/${quizId}/results`).then(setData).catch(() => {}); }, [quizId]);
  if (!data) return null;
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <h2>Results — {data.quiz.title}</h2>
        <div className="list">
          {data.results.length === 0 && <div className="empty">No attempts yet.</div>}
          {data.results.map((r, i) => {
            const pct = Math.round((r.score / r.total) * 100);
            return (
              <div className="list-item" key={i}>
                <div className="avatar">{r.student.name?.[0]?.toUpperCase()}</div>
                <div className="grow">
                  <div className="title">{r.student.name}</div>
                  <div className="sub">{r.status === 'finished' ? `Finished ${fmtDateTime(r.finishedAt)}` : 'In progress'}</div>
                </div>
                <span className={`badge ${pct >= 70 ? 'done' : pct >= 50 ? 'medium' : 'high'}`}>{r.score}/{r.total} · {pct}%</span>
              </div>
            );
          })}
        </div>
        <div className="modal-actions"><button className="btn" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

function PostQuizModal({ subjects, onDone, onClose }) {
  const [form, setForm] = useState({ subjectId: subjects[0]?.id || '', title: '', description: '', totalMarks: 10, date: '', category: 'quiz' });
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
        <h2>Post a classroom quiz</h2>
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
          <div className="field">
            <label>Counts toward</label>
            <select value={form.category} onChange={set('category')}>
              <option value="quiz">Quizzes</option>
              <option value="assignment">Assignments</option>
              <option value="mid">Midterm</option>
              <option value="final">Final</option>
              <option value="presentation">Presentation</option>
            </select>
          </div>
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
