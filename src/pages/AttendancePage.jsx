import React, { useEffect, useState } from 'react';
import { api, getUser } from '../api';
import { HBarChart, Donut } from '../components/Charts';

export default function AttendancePage() {
  const role = getUser()?.role || 'student';
  return role === 'student' ? <StudentAttendance /> : <TeacherAttendance />;
}

/* ---------------- Teacher: mark attendance ---------------- */
function TeacherAttendance() {
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({}); // studentId -> status
  const [stats, setStats] = useState([]);
  const [toast, setToast] = useState('');

  useEffect(() => {
    api('/teacher/subjects').then((s) => {
      setSubjects(s);
      if (s[0]) setSubjectId(String(s[0].id));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!subjectId) return;
    api(`/attendance/sheet?subjectId=${subjectId}&date=${date}`).then((d) => {
      setStudents(d.students);
      const m = {};
      d.students.forEach((s) => { m[s.id] = 'present'; });
      d.records.forEach((r) => { m[r.studentId] = r.status; });
      setMarks(m);
    }).catch(() => {});
    api(`/attendance/stats?subjectId=${subjectId}`).then(setStats).catch(() => {});
  }, [subjectId, date]);

  const notify = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  const save = async () => {
    await api('/attendance', {
      method: 'POST',
      body: { subjectId: +subjectId, date, records: students.map((s) => ({ studentId: s.id, status: marks[s.id] || 'present' })) },
    });
    api(`/attendance/stats?subjectId=${subjectId}`).then(setStats).catch(() => {});
    notify('Attendance saved');
  };

  const STATUSES = [['present', 'Present'], ['late', 'Late'], ['absent', 'Absent']];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Attendance</h1>
          <p>Mark attendance for your class in each timeslot.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="form-row" style={{ maxWidth: 500 }}>
          <div className="field">
            <label>Class</label>
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </select>
          </div>
          <div className="field">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div className="list">
          {students.length === 0 && <div className="empty">No students enrolled in this class.</div>}
          {students.map((s) => (
            <div className="list-item" key={s.id}>
              <div className="grow">
                <div className="title">{s.name}</div>
                <div className="sub">{s.email}</div>
              </div>
              <div className="tabs" style={{ margin: 0 }}>
                {STATUSES.map(([val, label]) => (
                  <button key={val} className={marks[s.id] === val ? 'active' : ''}
                    onClick={() => setMarks({ ...marks, [s.id]: val })}>{label}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {students.length > 0 && (
          <div style={{ marginTop: 14, textAlign: 'right' }}>
            <button className="btn primary" onClick={save}>Save attendance</button>
          </div>
        )}
      </div>

      {stats.length > 0 && (
        <div className="card">
          <h3>Attendance rate per student (all recorded days)</h3>
          <HBarChart suffix="%" data={stats.map((r) => ({
            label: r.student.name, value: r.pct ?? 0,
            color: (r.pct ?? 0) >= 80 ? '#10b981' : (r.pct ?? 0) >= 60 ? '#f59e0b' : '#ef4444',
          }))} />
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

/* ---------------- Student: my attendance ---------------- */
function StudentAttendance() {
  const [data, setData] = useState({ records: [], subjects: [] });
  useEffect(() => { api('/attendance/my').then(setData).catch(() => {}); }, []);

  const bySubject = data.subjects.map((s) => {
    const mine = data.records.filter((r) => r.subjectId === s.id);
    const present = mine.filter((r) => r.status !== 'absent').length;
    return { subject: s, total: mine.length, present, pct: mine.length ? Math.round((present / mine.length) * 100) : 0 };
  });
  const totals = {
    present: data.records.filter((r) => r.status === 'present').length,
    late: data.records.filter((r) => r.status === 'late').length,
    absent: data.records.filter((r) => r.status === 'absent').length,
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>My Attendance</h1>
          <p>Attendance recorded by your teachers, per class.</p>
        </div>
      </div>

      {data.records.length === 0 ? (
        <div className="empty card">No attendance recorded yet. It will appear once your teacher takes attendance.</div>
      ) : (
        <>
          <div className="grid cols-2" style={{ marginBottom: 16 }}>
            <div className="card">
              <h3>Overall</h3>
              <Donut data={[
                { label: 'Present', value: totals.present, color: '#10b981' },
                { label: 'Late', value: totals.late, color: '#f59e0b' },
                { label: 'Absent', value: totals.absent, color: '#ef4444' },
              ]} />
            </div>
            <div className="card">
              <h3>Attendance rate per class</h3>
              <HBarChart suffix="%" data={bySubject.map((b) => ({
                label: b.subject.name, value: b.pct,
                color: b.pct >= 80 ? '#10b981' : b.pct >= 60 ? '#f59e0b' : '#ef4444',
              }))} />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
                Most universities require 75%+ attendance to sit the final exam.
              </div>
            </div>
          </div>
          <div className="card">
            <h3>Recent records</h3>
            <div className="list">
              {data.records.slice(0, 15).map((r) => (
                <div className="list-item" key={r.id}>
                  <div className="grow">
                    <div className="title">{data.subjects.find((s) => s.id === r.subjectId)?.name || 'Class'}</div>
                    <div className="sub">{r.date}</div>
                  </div>
                  <span className={`badge ${r.status === 'present' ? 'done' : r.status === 'late' ? 'medium' : 'high'}`}>{r.status}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
