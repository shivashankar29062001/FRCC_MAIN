import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function Notifications() {
  const [items, setItems] = useState([]);
  useEffect(() => { api('/notifications').then(d => setItems(d.notifications)).catch(() => {}); }, []);
  const markRead = async () => { await api('/notifications/read', { method: 'POST' }); setItems(items.map(i => ({ ...i, read: true }))); };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl">Notifications</h1>
        {items.some(i => !i.read) && <button onClick={markRead} className="text-sm text-navy underline decoration-gold">Mark all read</button>}
      </div>
      {items.length === 0 ? <p className="text-gray-500">No notifications yet.</p> : (
        <ul className="space-y-2">
          {items.map(n => (
            <li key={n.id} className={`rounded shadow p-4 text-sm ${n.read ? 'bg-white' : 'bg-amber-50 border border-gold'}`}>
              {n.message}
              <span className="block text-xs text-gray-500 mt-1">{new Date(n.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
