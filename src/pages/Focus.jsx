import React, { useEffect, useRef, useState } from 'react';
import { BarChart } from '../components/Charts';

const MODES = [
  { key: 'focus', label: 'Focus', mins: 25 },
  { key: 'short', label: 'Short break', mins: 5 },
  { key: 'long', label: 'Long break', mins: 15 },
];

// Demo starts with an existing focus history; new sessions add to it.
const getStats = () => {
  try {
    return JSON.parse(localStorage.getItem('sf_focus')) || { allTime: 24, streak: 5 };
  } catch { return { allTime: 24, streak: 5 }; }
};

export default function Focus() {
  const [mode, setMode] = useState(MODES[0]);
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [stats, setStats] = useState(getStats);
  const tick = useRef();

  useEffect(() => {
    localStorage.setItem('sf_focus', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    if (!running) return;
    tick.current = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          clearInterval(tick.current);
          setRunning(false);
          if (mode.key === 'focus') {
            setSessions((s) => s + 1);
            setStats((st) => ({ ...st, allTime: st.allTime + 1 }));
          }
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
          <div className="timer-label">{running ? 'Stay locked in...' : left === 0 ? 'Done! Take a breather.' : 'Ready when you are'}</div>
          <div className="progressbar" style={{ marginTop: 16 }}><div style={{ width: `${pct}%` }} /></div>
          <div className="timer-controls">
            <button className="btn primary" onClick={() => (left === 0 ? pick(mode) : setRunning(!running))}>
              {left === 0 ? 'Reset' : running ? 'Pause' : 'Start'}
            </button>
            <button className="btn" onClick={() => pick(mode)}>Reset</button>
          </div>
        </div>
        <div className="card">
          <h3>Your focus stats</h3>
          <div style={{ display: 'flex', gap: 24, marginBottom: 18, flexWrap: 'wrap' }}>
            <div className="stat"><span className="num">{sessions}</span><span className="lbl">Today's pomodoros</span></div>
            <div className="stat"><span className="num">{sessions * 25}</span><span className="lbl">Minutes today</span></div>
            <div className="stat"><span className="num">{stats.allTime}</span><span className="lbl">All-time pomodoros</span></div>
            <div className="stat"><span className="num">{stats.streak}</span><span className="lbl">Day streak</span></div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Daily goal: 4 pomodoros</div>
            <div className="progressbar"><div style={{ width: `${Math.min(100, (sessions / 4) * 100)}%` }} /></div>
          </div>
          <h3>This week's focus minutes</h3>
          <BarChart suffix="m" data={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => {
            const base = [75, 50, 100, 25, 50, 0, 0][i];
            const jsDay = new Date().getDay();
            const todayIdx = jsDay === 0 ? 6 : jsDay - 1;
            return { label: d, value: i === todayIdx ? sessions * 25 : (i < todayIdx ? base : 0), color: i === todayIdx ? 'var(--primary)' : '#a5a8f0' };
          })} />
          <div style={{ height: 14 }} />
          <h3>How it works</h3>
          <div style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7 }}>
            1. Pick a task (an assignment works great).<br />
            2. Run a 25-minute focus session - no phone, no tabs.<br />
            3. Take a 5-minute break. Every 4 sessions, take a long one.<br />
            4. Watch your pending assignments melt away.
          </div>
        </div>
      </div>
    </>
  );
}
