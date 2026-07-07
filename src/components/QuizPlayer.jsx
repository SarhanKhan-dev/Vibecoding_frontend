import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api';

// Full-screen timed MCQ player: 1 question at a time, auto-advance when time runs out.
export default function QuizPlayer({ quizId, onExit }) {
  const [data, setData] = useState(null);   // {attemptId, questions, secondsPerQuestion, title}
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(60);
  const [picked, setPicked] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const timer = useRef();
  const state = useRef({}); // avoid stale closures

  useEffect(() => {
    api(`/online/${quizId}/start`, { method: 'POST' })
      .then((d) => {
        setData(d);
        const firstUnanswered = d.questions.findIndex((q) => d.answered[q.id] === undefined);
        setIdx(firstUnanswered === -1 ? 0 : firstUnanswered);
        setLeft(d.secondsPerQuestion);
      })
      .catch((e) => setError(e.message));
  }, [quizId]);

  state.current = { data, idx, picked };

  useEffect(() => {
    if (!data || result) return;
    setLeft(data.secondsPerQuestion);
    setPicked(null);
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) { advance(); return data.secondsPerQuestion; }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, data, result]);

  const advance = async () => {
    const { data: d, idx: i, picked: p } = state.current;
    if (!d) return;
    const q = d.questions[i];
    try {
      await api(`/online/attempt/${d.attemptId}/answer`, { method: 'POST', body: { questionId: q.id, answer: p ?? -1 } });
    } catch {}
    if (i + 1 < d.questions.length) {
      setIdx(i + 1);
    } else {
      clearInterval(timer.current);
      try {
        const r = await api(`/online/attempt/${d.attemptId}/finish`, { method: 'POST' });
        setResult(r);
      } catch (e) { setError(e.message); }
    }
  };

  if (error) {
    return (
      <div className="modal-back">
        <div className="modal" style={{ textAlign: 'center' }}>
          <h2>Cannot start</h2>
          <div className="error-box">{error}</div>
          <button className="btn primary" onClick={onExit}>Back</button>
        </div>
      </div>
    );
  }
  if (!data) return <div className="modal-back"><div className="modal">Loading your question set…</div></div>;

  if (result) {
    const pct = Math.round((result.score / result.total) * 100);
    return (
      <div className="modal-back">
        <div className="modal" style={{ textAlign: 'center', maxWidth: 420 }}>
          <h2>Quiz complete</h2>
          <div className="timer-display" style={{ margin: '10px 0' }}>{result.score}/{result.total}</div>
          <span className={`badge ${pct >= 70 ? 'done' : pct >= 50 ? 'medium' : 'high'}`}>{pct}% — auto-graded</span>
          <div style={{ marginTop: 18 }}>
            <button className="btn primary" onClick={onExit}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  const q = data.questions[idx];
  const pct = (left / data.secondsPerQuestion) * 100;
  return (
    <div className="modal-back">
      <div className="modal" style={{ maxWidth: 620 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <b style={{ fontSize: 14 }}>{data.title}</b>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>Question {idx + 1} of {data.questions.length}</span>
          <span className={`badge ${left <= 10 ? 'high' : 'todo'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{left}s</span>
        </div>
        <div className="progressbar" style={{ marginBottom: 16 }}>
          <div style={{ width: `${pct}%`, background: left <= 10 ? 'var(--red)' : undefined }} />
        </div>
        <h2 style={{ fontSize: 16, lineHeight: 1.5 }}>{q.text}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '16px 0' }}>
          {q.options.map((opt, i) => (
            <button key={i} className="btn" onClick={() => setPicked(i)}
              style={{
                justifyContent: 'flex-start', padding: '11px 14px', textAlign: 'left',
                borderColor: picked === i ? 'var(--primary)' : undefined,
                background: picked === i ? 'var(--primary-soft)' : undefined,
                color: picked === i ? 'var(--primary)' : undefined,
              }}>
              <b style={{ marginRight: 8 }}>{String.fromCharCode(65 + i)}.</b> {opt}
            </button>
          ))}
        </div>
        <div className="modal-actions">
          <span style={{ marginRight: 'auto', fontSize: 12, color: 'var(--muted)' }}>
            {picked === null ? 'Pick an answer before time runs out' : 'Answer locked in when you continue'}
          </span>
          <button className="btn primary" onClick={advance}>
            {idx + 1 === data.questions.length ? 'Finish quiz' : 'Next question'}
          </button>
        </div>
      </div>
    </div>
  );
}
