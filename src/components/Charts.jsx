import React from 'react';

// Lightweight chart components - zero dependencies, theme-aware.

export function BarChart({ data, height = 130, suffix = '' }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="chart-bars" style={{ height }}>
      {data.map((d, i) => (
        <div className="chart-bar-col" key={i} title={`${d.label}: ${d.value}${suffix}`}>
          <span className="chart-bar-val">{d.value > 0 ? d.value : ''}</span>
          <div
            className="chart-bar"
            style={{
              height: `${Math.max(4, (d.value / max) * 100)}%`,
              background: d.color || 'var(--primary)',
              opacity: d.value === 0 ? 0.25 : 1,
            }}
          />
          <span className="chart-bar-lbl">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Donut({ data, size = 120, thickness = 16 }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="chart-donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={thickness} />
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = `${frac * c} ${c}`;
          const offset = -acc * c;
          acc += frac;
          return (
            <circle
              key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={d.color} strokeWidth={thickness}
              strokeDasharray={dash} strokeDashoffset={offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              strokeLinecap="butt"
            />
          );
        })}
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
          style={{ fill: 'var(--text)', fontSize: 18, fontWeight: 800, fontFamily: 'inherit' }}>
          {total === 1 && data.every((d) => d.value === 0) ? 0 : data.reduce((s, d) => s + d.value, 0)}
        </text>
      </svg>
      <div className="chart-legend">
        {data.map((d, i) => (
          <div key={i} className="chart-legend-item">
            <span className="dot" style={{ background: d.color }} />
            <span>{d.label}</span>
            <b style={{ marginLeft: 'auto' }}>{d.value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HBarChart({ data, suffix = '' }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="chart-hbars">
      {data.map((d, i) => (
        <div className="chart-hbar-row" key={i}>
          <span className="chart-hbar-lbl" title={d.label}>{d.label}</span>
          <div className="chart-hbar-track">
            <div className="chart-hbar-fill" style={{ width: `${(d.value / max) * 100}%`, background: d.color || 'var(--primary)' }} />
          </div>
          <b className="chart-hbar-val">{d.value}{suffix}</b>
        </div>
      ))}
    </div>
  );
}
