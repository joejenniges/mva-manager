import { useState } from "react";
import { useEvent } from "../event";
import { normalizeDateValue } from "../utils/dateInput";

export default function EventSetup() {
  const { createEvent } = useEvent();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    setSaving(true);
    setError("");
    try {
      await createEvent({
        title: title.trim(),
        date,
        notes: notes.trim() || null,
        address: null,
        city: null,
        state: null,
        zip: null,
        lat: null,
        lng: null,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create event");
      setSaving(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-950">
      <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-8">
        <h2 className="mb-2 text-xl font-semibold text-gray-100">Create Your First Case</h2>
        <p className="mb-6 text-sm text-gray-400">
          An event represents a vehicle accident or case. All appointments, persons, and documents are organized within an event.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded border border-red-800 bg-red-900/30 px-4 py-2 text-sm text-red-400">{error}</div>
          )}

          <div>
            <label className="mb-1 block text-sm text-gray-400">Case Title *</label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Smith MVA - Jan 2026"
              className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-400">Date of Incident *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onBlur={(e) => setDate(normalizeDateValue(e.target.value))}
              className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-400">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving || !title.trim() || !date}
            className="w-full rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Event"}
          </button>
        </form>
      </div>
    </div>
  );
}
