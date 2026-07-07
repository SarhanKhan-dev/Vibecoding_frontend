import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getUser, DAYS, fmtDateTime, daysUntil } from '../api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const user = getUser();

  useEffect(() => {
    api('/dashboard').then(setData).catch(() => {});
    api('/subjects').then(setSubjects).catch(() => {});
  }, []);

  if (!data) return <div className="empty">Loading your dashboard…</div>;
  const sub = (id) => subjects.find((s) => s.id === id);
  const { stats } = data;
  const totalA = stats.pendingAssignments + stats.completedAssignments;
  const donePct = totalA ? Math.round((stats.completedAssignments / totalA) * 100) : 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Hey {user?.name?.split(' ')[0]} 👋</h1>
          <p>Here's what your {DAYS[data.today]} looks like.</p>
        </div>
        <Link to="/app/focus" className="btn primary">⏱ Start a focus session</Link>
      </div>

      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <div className="card stat"><span className="ico">📚</span><span className="num">{stats.subjects}</span><span className="lbl">Subjects</span></div>
        <div className="card stat"><span className="ico">🗓</span><span className="num">{stats.classesPerWeek}</span><span className="lbl">Classes / week</span></div>
        <div className="card stat"><span className="ico">⏳</span><span className="num">{stats.pendingAssignments}</span><span className="lbl">Pending tasks {data.overdueCount > 0 && <span style={{ color: 'var(--red)' }}>({data.overdueCount} overdue)</span>}</span></div>
        <div className="card stat"><span className="ico">📈</span><span className="num">{stats.gpa ?? '—'}</span><span className="lbl">Current GPA</span></div>
      </div>

      <div className="grid cols-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <h3>🗓 Today's classes <Link to="/app/schedule" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--primary)' }}>Full schedule →</Link></h3>
          <div className="list">
            {data.todayClasses.length === 0 && <div className="empty">No classes today. Enjoy! 🎉</div>}
            {data.todayClasses.map((c) => {
              const s = sub(c.subjectId);
              return (
                <div className="list-item" key={c.id}>
                  <span className="dot" style={{ background: s?.color || 'var(--primary)' }} />
                  <div className="grow">
                    <div className="title">{s?.name || c.title || 'Class'}</div>
                    <div className="sub">{c.startTime} – {c.endTime} · {c.room || s?.room || ''} · {c.type}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h3>✅ Due soon <Link to="/app/assignments" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--primary)' }}>All assignments →</Link></h3>
          <div className="list">
            {data.upcomingAssignments.length === 0 && <div className="empty">Nothing due in the next 7 days 🎉</div>}
            {data.upcomingAssignments.map((a) => {
              const d = daysUntil(a.dueDate);
              return (
                <div className="list-item" key={a.id}>
                  <div className="grow">
                    <div className="title">{a.title}</div>
                    <div className="sub">{sub(a.subjectId)?.name || 'General'} · {fmtDateTime(a.dueDate)}</div>
                  </div>
                  <span className={`badge ${a.priority}`}>{d < 0 ? 'overdue' : d === 0 ? 'today' : `${d}d left`}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3>🎯 Upcoming exams <Link to="/app/exams" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--primary)' }}>All exams →</Link></h3>
          <div className="list">
            {data.upcomingExams.length === 0 && <div className="empty">No exams scheduled. Lucky you!</div>}
            {data.upcomingExams.map((e) => {
              const d = daysUntil(e.date);
              return (
                <div className="list-item" key={e.id}>
                  <span className="dot" style={{ background: sub(e.subjectId)?.color || 'var(--amber)' }} />
                  <div className="grow">
                    <div className="title">{e.title}</div>
                    <div className="sub">{fmtDateTime(e.date)} · {e.location}</div>
                  </div>
                  <span className="badge medium">{d === 0 ? 'today!' : `${d} days`}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h3>📊 Semester progress</h3>
          <div style={{ marginBottom: 8, fontSize: 13, color: 'var(--muted)' }}>
            Assignments completed: <b style={{ color: 'var(--text)' }}>{stats.completedAssignments}/{totalA}</b>
          </div>
          <div className="progressbar"><div style={{ width: `${donePct}%` }} /></div>
          <div style={{ display: 'flex', gap: 18, marginTop: 18, flexWrap: 'wrap' }}>
            <div className="stat"><span className="num" style={{ fontSize: 20 }}>{stats.notes}</span><span className="lbl">Notes</span></div>
            <div className="stat"><span className="num" style={{ fontSize: 20 }}>{stats.slides}</span><span className="lbl">Slides stored</span></div>
            <div className="stat"><span className="num" style={{ fontSize: 20 }}>{donePct}%</span><span className="lbl">Completion</span></div>
          </div>
        </div>
      </div>
    </>
  );
}
