import React, { useEffect, useState } from 'react';
import { api, fileUrl, fmtDateTime } from '../api';
import { Donut } from '../components/Charts';

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [exams, setExams] = useState([]);
  const [changes, setChanges] = useState([]);
  const [schedModal, setSchedModal] = useState(null);
  const [toast, setToast] = useState('');

  const load = () => {
    api('/admin/stats').then(setStats).catch(() => {});
    api('/admin/users').then(setUsers).catch(() => {});
    api('/online/exams').then(setExams).catch(() => {});
    api('/teacher-change').then(setChanges).catch(() => {});
  };
  useEffect(load, []);
  const notify = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  const setRole = async (id, role) => {
    await api(`/admin/users/${id}`, { method: 'PATCH', body: { role } });
    load(); notify('Role updated');
  };
  const removeUser = async (id) => {
    if (!confirm('Delete this user?')) return;
    await api(`/admin/users/${id}`, { method: 'DELETE' });
    load(); notify('User deleted');
  };
  const decideChange = async (id, status) => {
    const adminComment = status === 'rejected' ? (prompt('Comment for the student (optional):') || '') : (prompt('Comment (e.g. effective date, new section):') || '');
    await api(`/teacher-change/${id}`, { method: 'PATCH', body: { status, adminComment } });
    load(); notify(`Request ${status}`);
  };

  const pendingChanges = changes.filter((c) => c.status === 'pending');
  const unscheduled = exams.filter((e) => !e.startAt);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Admin Console</h1>
          <p>{unscheduled.length} exam{unscheduled.length === 1 ? '' : 's'} awaiting schedule · {pendingChanges.length} teacher-change request{pendingChanges.length === 1 ? '' : 's'} pending.</p>
        </div>
      </div>

      {stats && (
        <div className="grid cols-4" style={{ marginBottom: 16 }}>
          <div className="card stat"><span className="num">{stats.total}</span><span className="lbl">Total users</span></div>
          <div className="card stat"><span className="num">{stats.subjects}</span><span className="lbl">Subjects</span></div>
          <div className="card stat"><span className="num">{stats.quizzes}</span><span className="lbl">Quizzes & exams</span></div>
          <div className="card stat"><span className="num">{stats.enrollments}</span><span className="lbl">Enrollments</span></div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Exam scheduling — teachers submit exams, you set the date & time</h3>
        <div className="list">
          {exams.length === 0 && <div className="empty">No exams submitted yet.</div>}
          {exams.map((e) => (
            <div className="list-item" key={e.id}>
              <div className="grow">
                <div className="title">{e.title} — {e.subject?.name}</div>
                <div className="sub">
                  By {e.teacher?.name} · {e.questionCount} MCQs in bank · {e.questionsPerStudent} per student · 1 min each
                  ({e.questionsPerStudent} min total)
                </div>
                {e.startAt && <div className="sub" style={{ color: 'var(--green)' }}>Scheduled: {fmtDateTime(e.startAt)} → {fmtDateTime(e.endAt)}</div>}
              </div>
              <button className="btn sm primary" onClick={() => setSchedModal(e)}>{e.startAt ? 'Reschedule' : 'Schedule'}</button>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Teacher-change requests from students</h3>
        <div className="list">
          {changes.length === 0 && <div className="empty">No requests.</div>}
          {changes.map((r) => (
            <div className="list-item" key={r.id}>
              <div className="grow">
                <div className="title">{r.student?.name} — {r.subject?.name || 'General'}{r.desiredTeacher ? ` → ${r.desiredTeacher}` : ''}</div>
                <div className="sub">{r.reason}</div>
              </div>
              {r.filename && <a className="btn sm" href={fileUrl(r.filename)} target="_blank" rel="noreferrer">Doc</a>}
              {r.status === 'pending' ? (
                <>
                  <button className="btn sm primary" onClick={() => decideChange(r.id, 'approved')}>Approve</button>
                  <button className="btn sm danger" onClick={() => decideChange(r.id, 'rejected')}>Reject</button>
                </>
              ) : <span className={`badge ${r.status === 'approved' ? 'done' : 'high'}`}>{r.status}</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        {stats && (
          <div className="card">
            <h3>Users by role</h3>
            <Donut data={[
              { label: 'Students', value: stats.students, color: '#6366f1' },
              { label: 'Teachers', value: stats.teachers, color: '#f59e0b' },
              { label: 'Admins', value: stats.total - stats.students - stats.teachers, color: '#ef4444' },
            ]} />
          </div>
        )}
        <div className="card">
          <h3>All users</h3>
          <div className="list" style={{ maxHeight: 380, overflowY: 'auto' }}>
            {users.map((u) => (
              <div className="list-item" key={u.id}>
                <div className="avatar">{u.name[0]?.toUpperCase()}</div>
                <div className="grow">
                  <div className="title">{u.name}</div>
                  <div className="sub">{u.email}</div>
                </div>
                <select style={{ width: 120 }} value={u.role} onChange={(e) => setRole(u.id, e.target.value)}>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="superadmin">Superadmin</option>
                </select>
                <button className="btn sm ghost" onClick={() => removeUser(u.id)}>×</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {schedModal && <ScheduleModal exam={schedModal} onDone={() => { setSchedModal(null); load(); notify('Exam scheduled — students can now see the window'); }} onClose={() => setSchedModal(null)} />}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

function ScheduleModal({ exam, onDone, onClose }) {
  const [startAt, setStartAt] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    if (!startAt) { setError('Pick a start date & time.'); return; }
    try {
      await api(`/online/${exam.id}/schedule`, { method: 'PATCH', body: { startAt: new Date(startAt).toISOString() } });
      onDone();
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Schedule — {exam.title}</h2>
        {error && <div className="error-box">{error}</div>}
        <div className="field">
          <label>Exam starts at</label>
          <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
        </div>
        <div className="demo-hint" style={{ cursor: 'default', textAlign: 'left' }}>
          {exam.questionsPerStudent} questions × 1 minute = {exam.questionsPerStudent} minutes per student.
          The window closes automatically {exam.questionsPerStudent + 10} minutes after start (10 min grace).
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={submit}>Set exam time</button>
        </div>
      </div>
    </div>
  );
}
