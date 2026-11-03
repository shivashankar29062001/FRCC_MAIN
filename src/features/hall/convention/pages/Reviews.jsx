import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [form, setForm] = useState({ rating: 5, comment: '' });
  const [msg, setMsg] = useState('');

  const load = () => api('/reviews', { auth: false }).then(d => setReviews(d.reviews)).catch(() => {});
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.comment.trim()) return;
    await api('/reviews', { method: 'POST', body: form });
    setMsg('Thanks for your review!'); setForm({ rating: 5, comment: '' }); load();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl mb-6">Reviews & Ratings</h1>
      <form onSubmit={submit} className="bg-white rounded shadow p-5 mb-8 space-y-3">
        <label className="block">Rating
          <select className="border rounded p-2 ml-2" value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })}>
            {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} ★</option>)}
          </select></label>
        <label className="block">Your review
          <textarea rows={3} className="w-full border rounded p-2 mt-1" value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} /></label>
        {msg && <p className="text-green-700 text-sm">{msg}</p>}
        <button className="bg-navy text-gold px-5 py-2 rounded font-semibold">Submit Review</button>
      </form>
      {reviews.length === 0 ? <p className="text-gray-500">No reviews yet. Be the first!</p> : (
        <ul className="space-y-3">
          {reviews.map(r => (
            <li key={r.id} className="bg-white rounded shadow p-4">
              <p className="font-semibold text-navy">{r.userName} <span className="text-gold">{'★'.repeat(r.rating)}</span></p>
              <p className="text-sm text-gray-700">{r.comment}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
