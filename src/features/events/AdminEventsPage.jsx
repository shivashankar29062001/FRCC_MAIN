// ---------------------------------------------------------------------------
// /src/features/events/AdminEventsPage.jsx — Admin Events Management
// Protected route /admin/events: table of events + Add/Edit form.
// Redirects non-admins to "/".
// ---------------------------------------------------------------------------

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  isAdmin,
  adminListEvents,
  adminSaveEvent,
  adminDeleteEvent,
  uploadEventImage,
} from '../../api/events.js';
import { EVENT_CATEGORIES, getCategoryLabel, getCategoryBadgeClass } from '../../data/events.js';
import { formatDMY, parseDMY } from '../../utils/dates.js';
import {
  CalendarIcon,
  ClockIcon,
  PlusIcon,
  TrashIcon,
  EditIcon,
  CheckCircleIcon,
  XIcon,
} from '../../components/ui/icons.jsx';

const INITIAL_FORM = {
  id: null,
  title: '',
  category: 'screening',
  dateDMY: '',
  start_time: '18:00',
  end_time: '20:00',
  venue: 'FRCC',
  description: '',
  image_url: '',
  featured: false,
  active: true,
};

export function AdminEventsPage() {
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1 · Protect route: only admins allowed
  useEffect(() => {
    let active = true;
    async function verify() {
      try {
        const adminStatus = await isAdmin();
        if (!adminStatus) {
          navigate('/', { replace: true });
        } else if (active) {
          setCheckingAuth(false);
          loadEventsList();
        }
      } catch (err) {
        console.warn('[AdminEventsPage] Admin check failed:', err);
        navigate('/', { replace: true });
      }
    }
    verify();
    return () => {
      active = false;
    };
  }, [navigate]);

  async function loadEventsList() {
    setLoading(true);
    try {
      const data = await adminListEvents();
      setEvents(data || []);
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  }

  function handleStartEdit(evt) {
    setEditingId(evt.id);
    setFormData({
      id: evt.id,
      title: evt.title || '',
      category: evt.category || 'screening',
      dateDMY: formatDMY(evt.event_date),
      start_time: evt.start_time ? String(evt.start_time).slice(0, 5) : '',
      end_time: evt.end_time ? String(evt.end_time).slice(0, 5) : '',
      venue: evt.venue || 'FRCC',
      description: evt.description || '',
      image_url: evt.image_url || '',
      featured: Boolean(evt.featured),
      active: evt.active !== undefined ? Boolean(evt.active) : true,
    });
    setErrorMsg('');
    setSuccessMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleCancelEdit() {
    setEditingId(null);
    setFormData(INITIAL_FORM);
    setErrorMsg('');
  }

  async function handleToggleActive(evt) {
    try {
      await adminSaveEvent({ ...evt, active: !evt.active });
      setSuccessMsg(`Event "${evt.title}" marked as ${!evt.active ? 'active' : 'inactive'}.`);
      loadEventsList();
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to update event status.');
    }
  }

  async function handleDelete(id, title) {
    if (!window.confirm(`Are you sure you want to delete event "${title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await adminDeleteEvent(id);
      setSuccessMsg(`Event "${title}" deleted successfully.`);
      if (editingId === id) handleCancelEdit();
      loadEventsList();
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to delete event.');
    }
  }

  async function handleImageFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setErrorMsg('');
    try {
      const url = await uploadEventImage(file);
      if (url) {
        setFormData((prev) => ({ ...prev, image_url: url }));
        setSuccessMsg('Image uploaded successfully.');
      } else {
        setErrorMsg('Image upload unavailable. Please enter a public image URL manually.');
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to upload image.');
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.title.trim()) {
      setErrorMsg('Event title is required.');
      return;
    }

    const isoDate = parseDMY(formData.dateDMY);
    if (!isoDate) {
      setErrorMsg('Please enter a valid date in DD/MM/YYYY format.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: editingId,
        title: formData.title.trim(),
        category: formData.category,
        event_date: isoDate,
        start_time: formData.start_time ? `${formData.start_time}:00` : null,
        end_time: formData.end_time ? `${formData.end_time}:00` : null,
        venue: formData.venue.trim() || 'FRCC',
        description: formData.description.trim(),
        image_url: formData.image_url.trim() || null,
        featured: Boolean(formData.featured),
        active: Boolean(formData.active),
      };

      await adminSaveEvent(payload);
      setSuccessMsg(editingId ? 'Event updated successfully.' : 'New event created successfully.');
      handleCancelEdit();
      loadEventsList();
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to save event.');
    } finally {
      setSaving(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-navy-900 border-t-transparent" />
          <p className="mt-3 text-sm text-slate-500 font-medium">Verifying administrator access…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 sm:py-14">
      <div className="container-x max-w-6xl">
        {/* Header Breadcrumbs & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <Link to="/events" className="hover:text-gold-600 transition">Events</Link>
              <span>/</span>
              <span className="text-navy-900">Admin Management</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy-900">
              Manage Events
            </h1>
          </div>
          <Link
            to="/events"
            className="btn-base border border-slate-300 bg-white text-navy-900 hover:bg-slate-50 px-4 py-2 text-xs font-semibold self-start sm:self-auto"
          >
            View public page
          </Link>
        </div>

        {/* Global Feedback Notifications */}
        {errorMsg && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start justify-between gap-3">
            <span>{errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg('')} className="text-red-500 hover:text-red-700">
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-start justify-between gap-3">
            <span className="inline-flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-emerald-600 shrink-0" />
              {successMsg}
            </span>
            <button type="button" onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700">
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* 2 · Event Form (Add or Edit) */}
        <div className="card mt-8 !p-6 sm:!p-8 border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <h2 className="font-display text-lg font-bold text-navy-900 flex items-center gap-2">
              {editingId ? <EditIcon className="h-5 w-5 text-gold-600" /> : <PlusIcon className="h-5 w-5 text-gold-600" />}
              {editingId ? 'Edit Event' : 'Add New Event'}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline underline-offset-2"
              >
                Cancel editing
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              {/* Title */}
              <div className="sm:col-span-2">
                <label htmlFor="evt-title" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Event Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="evt-title"
                  type="text"
                  required
                  placeholder="e.g. Short Film Screening Night"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-navy-900 focus:outline-none"
                />
              </div>

              {/* Category */}
              <div>
                <label htmlFor="evt-category" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  id="evt-category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm bg-white focus:border-navy-900 focus:outline-none"
                >
                  <option value="screening">Screening</option>
                  <option value="workshop">Workshop</option>
                  <option value="meetup">Meetup</option>
                  <option value="cultural">Cultural</option>
                </select>
              </div>

              {/* Date DD/MM/YYYY */}
              <div>
                <label htmlFor="evt-date" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Event Date (DD/MM/YYYY) <span className="text-red-500">*</span>
                </label>
                <input
                  id="evt-date"
                  type="text"
                  required
                  placeholder="DD/MM/YYYY (e.g. 15/11/2026)"
                  value={formData.dateDMY}
                  onChange={(e) => setFormData({ ...formData, dateDMY: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-navy-900 focus:outline-none"
                />
              </div>

              {/* Start Time */}
              <div>
                <label htmlFor="evt-start" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Start Time (HH:MM)
                </label>
                <input
                  id="evt-start"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-navy-900 focus:outline-none"
                />
              </div>

              {/* End Time */}
              <div>
                <label htmlFor="evt-end" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  End Time (HH:MM)
                </label>
                <input
                  id="evt-end"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-navy-900 focus:outline-none"
                />
              </div>

              {/* Venue */}
              <div>
                <label htmlFor="evt-venue" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Venue
                </label>
                <input
                  id="evt-venue"
                  type="text"
                  placeholder="e.g. FRCC Main Auditorium"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-navy-900 focus:outline-none"
                />
              </div>

              {/* Image URL & Upload */}
              <div>
                <label htmlFor="evt-img-url" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Event Image (Upload or URL)
                </label>
                <div className="space-y-2">
                  <input
                    id="evt-img-url"
                    type="url"
                    placeholder="https://..."
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-navy-900 focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                      <span>{uploadingImage ? 'Uploading…' : 'Upload image file'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingImage}
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>
                    {formData.image_url && (
                      <span className="text-[11px] text-emerald-600 font-medium truncate max-w-xs">
                        Image attached
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label htmlFor="evt-desc" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  id="evt-desc"
                  rows={3}
                  placeholder="Detailed synopsis or schedule of the event…"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-navy-900 focus:outline-none"
                />
              </div>

              {/* Toggles: Featured & Active */}
              <div className="sm:col-span-2 flex flex-wrap items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-gold-600 focus:ring-gold-500"
                  />
                  <span>Mark as Featured</span>
                </label>

                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-gold-600 focus:ring-gold-500"
                  />
                  <span>Active (visible on public site)</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn-base border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 px-5 py-2 text-sm font-semibold"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={saving || uploadingImage}
                className="btn-base bg-navy-900 text-white hover:bg-navy-800 px-6 py-2 text-sm font-semibold shadow-sm"
              >
                {saving ? 'Saving…' : (editingId ? 'Update Event' : 'Create Event')}
              </button>
            </div>
          </form>
        </div>

        {/* 3 · Events Table */}
        <div className="card mt-10 !p-6 border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-navy-900">
              All Events ({events.length})
            </h2>
            <button
              type="button"
              onClick={loadEventsList}
              className="text-xs text-navy-900 hover:text-gold-600 font-semibold underline underline-offset-2"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">Loading events list…</div>
          ) : events.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No events found. Use the form above to create your first event.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-100/70 text-xs uppercase font-bold text-slate-500 tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.map((evt) => (
                    <tr key={evt.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-navy-900 max-w-xs truncate">
                        {evt.title}
                        {evt.isSample && (
                          <span className="ml-2 tag tag-amber !text-[9px] !py-0 !px-1.5 uppercase font-bold">
                            Sample
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`tag ${getCategoryBadgeClass(evt.category)} !text-[11px] !py-0.5 !px-2`}>
                          {getCategoryLabel(evt.category)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs font-mono text-slate-600">
                        {formatDMY(evt.event_date)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(evt)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition ${
                            evt.active
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${evt.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {evt.active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(evt)}
                            className="p-1 text-slate-500 hover:text-navy-900 transition"
                            title="Edit event"
                          >
                            <EditIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(evt.id, evt.title)}
                            className="p-1 text-red-500 hover:text-red-700 transition"
                            title="Delete event"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminEventsPage;
