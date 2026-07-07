import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { HBarChart } from '../components/Charts';

const CAT_LABELS = { quiz: 'Quizzes', assignment: 'Assignments', mid: 'Midterm', final: 'Final', presentation: 'Presentation' };
const CAT_COLORS = { quiz: '#6366f1', assignment: '#06b6d4', mid: '#f59e0b', final: '#ef4444', presentation: '#10b981' };

export default function ReportCard() {
  const [data, setData] = useState(null);
  useEffect(() => { api('/gradebook/my').then(setData).catch(() => {}); }, []);

  if (!data) return <div className="empty">Computing your grades…</div>;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Report Card</h1>
          <p>
            Weighted automatically — quizzes {data.weights.quiz}% · assignments {data.weights.assignment}% ·
            mids {data.weights.mid}% · finals {data.weights.final}% · presentations {data.weights.presentation}%.
            No calculators needed.
          </p>
        </div>
        <div className="card stat" style={{ padding: '10px 22px' }}>
          <span className="num">{data.gpa ?? '—'}</span>
          <span className="lbl">Current GPA</span>
        </div>
      </div>

      <div className="grid cols-2">
        {data.subjects.length === 0 && <div className="empty card">You're not enrolled in any class yet.</div>}
        {data.subjects.map((r) => (
          <div className="card subject-card" key={r.subject.id} style={{ borderTopColor: r.subject.color }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div className="code">{r.subject.code} · {r.subject.section || 'SECTION'} · {r.subject.teacher}</div>
                <h4>{r.subject.name}</h4>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 30, fontWeight: 800, color: r.total >= 70 ? 'var(--green)' : r.total >= 55 ? 'var(--amber)' : 'var(--red)' }}>
                  {r.letter ?? '—'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.total !== null ? `${r.total}%` : 'no marks yet'}</div>
              </div>
            </div>
            {Object.keys(r.breakdown).length > 0 ? (
              <div style={{ marginTop: 12 }}>
                <HBarChart suffix="%" data={Object.entries(r.breakdown).map(([cat, v]) => ({
                  label: `${CAT_LABELS[cat] || cat} (${v.weight}%)`,
                  value: Math.round(v.pct),
                  color: CAT_COLORS[cat] || 'var(--primary)',
                }))} />
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
                  Final exam not taken yet? Its weight is redistributed until it's graded.
                </div>
              </div>
            ) : <div className="empty">No graded work yet in this class.</div>}
          </div>
        ))}
      </div>
    </>
  );
}
