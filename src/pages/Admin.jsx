import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Donut } from '../components/Charts';

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [toast, setToast] = useState('');

  const load = () => {
    api('/admin/stats').then(setStats).catch(() => {});
    api('/admin/users').then(setUsers).catch(() => {});
  };
  useEffect(load, []);
  const notify = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  const setRole = async (id, role) => {
    await api(`/admin/users/${id}`, { method: 'PATCH', body: { role } });
    load(); notify('Role updated');
  };
  const remove = async (id) => {
    if (!confirm('Delete this user?')) return;
    await api(`/admin/users/${id}`, { method: 'DELETE' });
    load(); notify('User deleted');
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Admin Console</h1>
          <p>Manage every user and role on the platform.</p>
        </div>
      </div>

      {stats && (
        <div className="grid cols-4" style={{ marginBottom: 16 }}>
          <div className="card stat"><span className="num">{stats.total}</span><span className="lbl">Total users</span></div>
          <div className="card stat"><span className="num">{stats.subjects}</span><span className="lbl">Subjects</span></div>
          <div className="card stat"><span className="num">{stats.quizzes}</span><span className="lbl">Quizzes</span></div>
          <div className="card stat"><span className="num">{stats.leaves}</span><span className="lbl">Leave applications</span></div>
        </div>
      )}

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
          <div className="list">
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
                <button className="btn sm ghost" onClick={() => remove(u.id)}>×</button>
              </div>
            ))}
          </div>
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
