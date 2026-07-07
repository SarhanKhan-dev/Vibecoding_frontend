import React, { useEffect, useRef, useState } from 'react';

const MODES = [
  { key: 'focus', label: 'Focus', mins: 25 },
  { key: 'short', label: 'Short break', mins: 5 },
  { key: 'long', label: 'Long break', mins: 15 },
];

export default function Focus() {
  const [mode, setMode] = useState(MODES[0]);
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const tick = useRef();

  useEffect(() => {
    if (!running) return;
    tick.current = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          clearInterval(tick.current);
          setRunning(false);
          if (mode.key === 'focus') setSessions((s) => s + 1);
          try { new AudioContext(); } catch {}
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(tick.current);
  }, [running, mode]);

  const pick = (m) => { setMode(m); setLeft(m.mins * 60); setRunning(false); };
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  const pct = 100 - (left / (mode.mins * 60)) * 100;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Focus Timer</h1>
          <p>Pomodoro technique: 25 minutes of deep work, then a break. Repeat.</p>
        </div>
      </div>
      <div className="grid cols-2">
        <div className="card" style={{ padding: 32 }}>
          <div className="tabs" style={{ justifyContent: 'center' }}>
            {MODES.map((m) => (
              <button key={m.key} className={mode.key === m.key ? 'active' : ''} onClick={() => pick(m)}>{m.label}</button>
            ))}
          </div>
          <div className="timer-display">{mm}:{ss}</div>
          <div className="timer-label">{running ? 'Stay locked in…' : left === 0 ? 'Done! Take a breather 🎉' : 'Ready when you are'}</div>
          <div className="progressbar" style={{ marginTop: 16 }}><div style={{ width: `${pct}%` }} /></div>
          <div className="timer-controls">
            <button className="btn primary" onClick={() => (left === 0 ? pick(mode) : setRunning(!running))}>
              {left === 0 ? '↻ Reset' : running ? '⏸ Pause' : '▶ Start'}
            </button>
            <button className="btn" onClick={() => pick(mode)}>↻ Reset</button>
          </div>
        </div>
        <div className="card">
          <h3>📊 This session</h3>
          <div style={{ display: 'flex', gap: 24, marginBottom: 18 }}>
            <div className="stat"><span className="num">{sessions}</span><span className="lbl">Pomodoros done</span></div>
            <div className="stat"><span className="num">{sessions * 25}</span><span className="lbl">Focused minutes</span></div>
          </div>
          <h3>💡 How it works</h3>
          <div style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7 }}>
            1. Pick a task (an assignment works great).<br />
            2. Run a 25-minute focus session — no phone, no tabs.<br />
            3. Take a 5-minute break. Every 4 sessions, take a long one.<br />
            4. Watch your pending assignments melt away.
          </div>
        </div>
      </div>
    </>
  );
}
