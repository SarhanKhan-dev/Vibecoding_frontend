import React, { useEffect, useRef, useState } from 'react';
import { api, fileUrl, DAYS, DAYS_SHORT } from '../api';

const START_H = 8, END_H = 20, PX_PER_H = 56;
const toMin = (t) => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + m; };

export default function Schedule() {
  const [slots, setSlots] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [modal, setModal] = useState(null); // null | {slot?}
  const [toast, setToast] = useState('');
  const fileRef = useRef();

  const load = () => {
    api('/schedule').then(setSlots).catch(() => {});
    api('/subjects').then(setSubjects).catch(() => {});
    api('/schedule/uploads').then(setUploads).catch(() => {});
  };
  useEffect(load, []);

  const notify = (m) => { setToast(m); setTimeout(() => setToast(''), 2200); };
  const sub = (id) => subjects.find((s) => s.id === id);
  const jsDay = new Date().getDay();
  const today = jsDay === 0 ? 6 : jsDay - 1;

  const save = async (form) => {
    const body = { ...form, day: +form.day, subjectId: form.subjectId ? +form.subjectId : null };
    if (form.id) await api(`/schedule/${form.id}`, { method: 'PATCH', body });
    else await api('/schedule', { method: 'POST', body });
    setModal(null); load(); notify('Schedule updated');
  };
  const remove = async (id) => {
    await api(`/schedule/${id}`, { method: 'DELETE' });
    setModal(null); load(); notify('Class removed');
  };

  const uploadTimetable = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    await api('/schedule/upload', { method: 'POST', formData: fd });
    load(); notify('Timetable uploaded — now add your classes to the grid');
  };

  const hours = [];
  for (let h = START_H; h < END_H; h++) hours.push(h);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Weekly Schedule</h1>
          <p>Your timetable at a glance. Click any class to edit it.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="file" ref={fileRef} hidden accept="image/*,.pdf,.png,.jpg,.jpeg,.webp"
            onChange={(e) => uploadTimetable(e.target.files[0])} />
          <button className="btn" onClick={() => fileRef.current.click()}>Upload timetable file</button>
          <button className="btn primary" onClick={() => setModal({ day: today, startTime: '09:00', endTime: '10:30', type: 'lecture' })}>+ Add class</button>
        </div>
      </div>

      <div className="card tt-wrap">
        <div className="tt">
          <div />
          {DAYS_SHORT.slice(0, 6).map((d, i) => (
            <div key={d} className={`h ${i === today ? 'today' : ''}`}>{d}{i === today ? ' •' : ''}</div>
          ))}
          <div>
            {hours.map((h) => (
              <div key={h} className="time" style={{ height: PX_PER_H }}>{String(h).padStart(2, '0')}:00</div>
            ))}
          </div>
          {[0, 1, 2, 3, 4, 5].map((day) => (
            <div key={day} className="tt-day" style={{ height: (END_H - START_H) * PX_PER_H }}>
              {hours.map((h) => <div key={h} className="cell" style={{ height: PX_PER_H }} />)}
              {slots.filter((s) => s.day === day).map((s) => {
                const top = ((toMin(s.startTime) - START_H * 60) / 60) * PX_PER_H;
                const height = Math.max(28, ((toMin(s.endTime) - toMin(s.startTime)) / 60) * PX_PER_H - 3);
                const subj = sub(s.subjectId);
                return (
                  <div key={s.id} className="slot" style={{ top, height, background: subj?.color || '#6366f1' }}
                    onClick={() => setModal({ ...s })}>
                    <b>{subj?.name || s.title || 'Class'}</b>
                    <span>{s.startTime}–{s.endTime}{s.room ? ` · ${s.room}` : ''}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {uploads.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Uploaded timetable files</h3>
          <div className="list">
            {uploads.map((f) => (
              <div className="list-item" key={f.id}>
                <div className="file-ico">FILE</div>
                <div className="grow">
                  <div className="title">{f.originalName}</div>
                  <div className="sub">Reference copy of your original timetable</div>
                </div>
                <a className="btn sm" href={fileUrl(f.filename)} target="_blank" rel="noreferrer">View</a>
              </div>
            ))}
          </div>
        </div>
      )}

      {modal && (
        <SlotModal
          slot={modal} subjects={subjects}
          onSave={save} onDelete={remove} onClose={() => setModal(null)}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

function SlotModal({ slot, subjects, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({
    title: '', room: '', subjectId: '', ...slot,
    subjectId: slot.subjectId || '',
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{form.id ? 'Edit class' : 'Add a class'}</h2>
        <div className="field">
          <label>Subject</label>
          <select value={form.subjectId} onChange={set('subjectId')}>
            <option value="">— Custom (use title below) —</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
          </select>
        </div>
        {!form.subjectId && (
          <div className="field">
            <label>Title</label>
            <input value={form.title} onChange={set('title')} placeholder="e.g. Gym, Study group…" />
          </div>
        )}
        <div className="form-row">
          <div className="field">
            <label>Day</label>
            <select value={form.day} onChange={set('day')}>
              {DAYS.slice(0, 6).map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Type</label>
            <select value={form.type} onChange={set('type')}>
              <option value="lecture">Lecture</option>
              <option value="lab">Lab</option>
              <option value="tutorial">Tutorial</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Starts</label>
            <input type="time" value={form.startTime} onChange={set('startTime')} />
          </div>
          <div className="field">
            <label>Ends</label>
            <input type="time" value={form.endTime} onChange={set('endTime')} />
          </div>
        </div>
        <div className="field">
          <label>Room</label>
          <input value={form.room} onChange={set('room')} placeholder="e.g. B-104" />
        </div>
        <div className="modal-actions">
          {form.id && <button className="btn danger" onClick={() => onDelete(form.id)}>Delete</button>}
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => onSave(form)}>Save</button>
        </div>
      </div>
    </div>
  )