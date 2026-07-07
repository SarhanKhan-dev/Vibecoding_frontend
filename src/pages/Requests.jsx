import React, { useEffect, useRef, useState } from 'react';
import { api, getUser, fileUrl, fmtDate } from '../api';

export default function Requests() {
  const role = getUser()?.role || 'student';
  return role === 'student' ? <StudentRequests /> : <TeacherRequests />;
}

const statusBadge = (s) => `badge ${s === 'approved' ? 'done' : s === 'rejected' ? 'high' : 'medium'}`;

/* ---------------- Student: apply for leave ---------------- */
function StudentRequests() {
  const [enrolled, setEnrolled] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [form, setForm] = useState({ subjectId: '', reason: '', fromDate: '', toDate: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const fileRef = useRef();

  const load = () => {
    api('/my/enrollments').then((s) => {
      setEnrolled(s);
      setForm((f) => ({ ...f, subjectId: f.subjectId || (s[0]?.id ?? '') }));
    }).catch(() => {});
    api('/leaves').then(setLeaves).catch(() => {});
  };
  useEffect(load, []);
  const notify = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    if (!form.reason.trim()) { setError('Please give a reason for your leave.'); return; }
    setBusy(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (fileRef.current.files[0]) fd.append('file', fileRef.current.files[0]);
      await api('/leaves', { method: 'POST', formData: fd });
      setForm({ ...form, reason: '', fromDate: '', toDate: '' });
      fileRef.current.value = '';
      load(); notify('Leave application sent to your teacher');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Leave Applications</h1>
          <p>Apply for leave with supporting documents — your teacher will approve or reject it.</p>
        </div>
      </div>

      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <h3>New leave application</h3>
          {error && <div className="error-box">{error}</div>}
          {enrolled.length === 0 ? (
            <div className="empty">You're not enrolled in any class yet. Ask your teacher to add you by email.</div>
          ) : (
            <>
              <div className="field">
                <label>Class</label>
                <select value={form.subjectId} onChange={set('subjectId')}>
                  {enrolled.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code}) — {s.teacher}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="field"><label>From</label><input type="date" value={form.fromDate} onChange={set('fromDate')} /></div>
                <div className="field"><label>To</label><input type="date" value={form.toDate} onChange={set('toDate')} /></div>
              </div>
              <div className="field">
                <label>Reason</label>
                <textarea rows="4" value={form.reason} onChange={set('reason')}
                  placeholder="e.g. I was ill with a fever. Medical certificate attached." />
              </div>
              <div className="field">
                <label>Supporting document (medical certificate, invitation letter, etc.)</label>
                <input type="file" ref={fileRef} />
              </div>
              <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy} onClick={submit}>
                {busy ? 'Sending…' : 'Submit application'}
              </button>
            </>
          )}
        </div>

        <div className="card">
          <h3>My applications</h3>
          <div className="list">
            {leaves.length === 0 && <div className="empty">No leave applications yet.</div>}
            {leaves.map((l) => (
              <div className="list-item" key={l.id}>
                <div className="grow">
                  <div className="title">{l.subject?.name || 'Class'} {l.fromDate && `· ${l.fromDate}${l.toDate ? ` → ${l.toDate}` : ''}`}</div>
                  <div className="sub">{l.reason}</div>
                  {l.teacherComment && <div className="sub" style={{ color: 'var(--primary)' }}>Teacher: {l.teacherComment}</div>}
                </div>
                {l.filename && <a className="btn sm" href={fileUrl(l.filename)} target="_blank" rel="noreferrer">Doc</a>}
                <span className={statusBadge(l.status)}>{l.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

/* ---------------- Teacher: review leaves + retakes ---------------- */
function TeacherRequests() {
  const [tab, setTab] = useState('leaves');
  const [leaves, setLeaves] = useState([]);
  const [retakes, setRetakes] = useState([]);
  const [toast, setToast] = useState('');

  const load = () => {
    api('/leaves').then(setLeaves).catch(() => {});
    api('/retakes').then(setRetakes).catch(() => {});
  };
  useEffect(load, []);
  const notify = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  const decideLeave = async (id, status) => {
    const teacherComment = status === 'rejected' ? (prompt('Reason for rejection (shown to student):') || '') : '';
    await api(`/leaves/${id}`, { method: 'PATCH', body: { status, teacherComment } });
    load(); notify(`Leave ${status}`);
  };
  const decideRetake = async (id, status) => {
    await api(`/retakes/${id}`, { method: 'PATCH', body: { status } });
    load(); notify(`Retake ${status}${status === 'approved' ? ' — grade reopened for re-grading' : ''}`);
  };

  const pendingL = leaves.filter((l) => l.status === 'pending').length;
  const pendingR = retakes.filter((r) => r.status === 'pending').length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Student Requests</h1>
          <p>{pendingL} leave application{pendingL === 1 ? '' : 's'} and {pendingR} retake request{pendingR === 1 ? '' : 's'} waiting for you.</p>
        </div>
      </div>

      <div className="tabs">
        <button className={tab === 'leaves' ? 'active' : ''} onClick={() => setTab('leaves')}>Leave applications {pendingL > 0 && `(${pendingL})`}</button>
        <button className={tab === 'retakes' ? 'active' : ''} onClick={() => setTab('retakes')}>Quiz retakes {pendingR > 0 && `(${pendingR})`}</button>
      </div>

      {tab === 'leaves' && (
        <div className="card">
          <div className="list">
            {leaves.length === 0 && <div className="empty">No leave applications.</div>}
            {leaves.map((l) => (
              <div className="list-item" key={l.id}>
                <div className="grow">
                  <div className="title">{l.student?.name} — {l.subject?.name}</div>
                  <div className="sub">{l.reason}</div>
                  <div className="sub">{l.fromDate && `${l.fromDate}${l.toDate ? ` → ${l.toDate}` : ''} · `}Applied {fmtDate(l.createdAt)}</div>
                </div>
                {l.filename && <a className="btn sm" href={fileUrl(l.filename)} target="_blank" rel="noreferrer">View doc</a>}
                {l.status === 'pending' ? (
                  <>
                    <button className="btn sm primary" onClick={() => decideLeave(l.id, 'approved')}>Approve</button>
                    <button className="btn sm danger" onClick={() => decideLeave(l.id, 'rejected')}>Reject</button>
                  </>
                ) : <span className={statusBadge(l.status)}>{l.status}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'retakes' && (
        <div className="card">
          <div className="list">
            {retakes.length === 0 && <div className="empty">No retake requests.</div>}
            {retakes.map((r) => (
              <div className="list-item" key={r.id}>
                <div className="grow">
                  <div className="title">{r.student?.name} — {r.quiz?.title}</div>
                  <div className="sub">{r.reason}</div>
                  <div className="sub">Requested {fmtDate(r.createdAt)}</div>
                </div>
                {r.filename && <a className="btn sm" href={fileUrl(r.filename)} target="_blank" rel="noreferrer">View doc</a>}
                {r.status === 'pending' ? (
                  <>
                    <button className="btn sm primary" onClick={() => decideRetake(r.id, 'approved')}>Approve</button>
                    <button className="btn sm danger" onClick={() => decideRetake(r.id, 'rejected')}>Reject</button>
                  </>
                ) : <span className={statusBadge(r.status)}>{r.status}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
