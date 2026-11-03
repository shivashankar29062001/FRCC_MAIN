import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function Contact() {
  const [form, setForm] = useState({ subject: '', message: '' });
  const [tickets, setTickets] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = () => api('/contact/my').then(d => setTickets(d.tickets)).catch(() => {});
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) return setError('Subject and message are required.');
    try {
      await api('/contact', { method: 'POST', body: form });
      setMsg('Support ticket raised. We will respond shortly.');
      setError('');
      setForm({ subject: '', message: '' });
      load();
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl mb-6">Contact / Support</h1>
      <form onSubmit={submit} className="bg-white rounded shadow p-6 space-y-4 mb-8">
        <label className="block">Subject
          <input className="w-full border rounded p-2 mt-1" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></label>
        <label className="block">Message
          <textarea rows={4} className="w-full border rounded p-2 mt-1" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} /></label>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {msg && <p className="text-green-700 text-sm">{msg}</p>}
        <button className="bg-navy text-gold px-6 py-2 rounded font-semibold">Submit Ticket</button>
      </form>
      <h2 className="text-xl mb-3">Your Support Tickets</h2>
      {tickets.length === 0 ? <p className="text-gray-500">No tickets raised yet.</p> : (
        <ul className="space-y-2">{tickets.map(t => <li key={t.id} className="bg-white rounded shadow p-3 text-sm"><strong>{t.subject}</strong> — {t.message} <span className="ml-2 text-xs bg-navy-100 text-navy rounded px-2">{t.status}</span></li>)}</ul>
      )}
    </div>
  );
}
