import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import { useNavigateAfterSave } from "../hooks/useNavigateAfterSave";
import { useEvent } from "../event";
import Spinner from "../components/Spinner";
import { useToast } from "../components/Toast";
import AddressAutocomplete from "../components/AddressAutocomplete";
import useHotkeys from "../hooks/useHotkeys";

interface EventData {
  id: string;
  title: string;
  date: string;
  notes: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: string | null;
  lng: string | null;
  createdAt: string;
}

const INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export default function EventForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const navigateTo = useNavigateAfterSave();
  const { toast } = useToast();
  const { refreshEvents, setActiveEvent } = useEvent();
  const isNew = !id;

  useHotkeys({
    Escape: () => {
      const active = document.activeElement as HTMLElement;
      if (active && INPUT_TAGS.has(active.tagName)) active.blur();
      else navigate("/events");
    },
  });

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [lat, setLat] = useState<string | null>(null);
  const [lng, setLng] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    api<EventData>(`/api/v1/events/${id}`)
      .then((data) => {
        setTitle(data.title);
        setDate(data.date ?? "");
        setNotes(data.notes ?? "");
        setAddress(data.address ?? "");
        setCity(data.city ?? "");
        setState(data.state ?? "");
        setZip(data.zip ?? "");
        setLat(data.lat);
        setLng(data.lng);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load event");
      })
      .finally(() => setLoading(false));
  }, [id, isNew]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    setSaving(true);
    setError(null);

    const body = {
      title: title.trim(),
      date,
      notes: notes.trim() || null,
      address: address.trim() || null,
      city: city.trim() || null,
      state: state.trim() || null,
      zip: zip.trim() || null,
      lat: address.trim() ? lat : null,
      lng: address.trim() ? lng : null,
    };

    try {
      if (isNew) {
        const created = await api<EventData>("/api/v1/events", { method: "POST", body });
        refreshEvents();
        setActiveEvent(created);
        toast("Event created", "success");
      } else {
        await api(`/api/v1/events/${id}`, { method: "PATCH", body });
        refreshEvents();
        toast("Event updated", "success");
      }
      navigateTo("/events");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      toast("Failed to save event", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner className="py-12" />;

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-6 text-2xl font-semibold text-gray-100">
        {isNew ? "New Event" : "Edit Event"}
      </h2>

      {error && (
        <div className="mb-4 rounded border border-red-600/50 bg-red-600/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">
            Date *
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">
            Address
          </label>
          <AddressAutocomplete
            value={address}
            onChange={(val) => {
              setAddress(val);
              setLat(null);
              setLng(null);
            }}
            onSelect={(result) => {
              setAddress(result.address);
              setCity(result.city);
              setState(result.state);
              setZip(result.zip);
              setLat(result.lat);
              setLng(result.lng);
            }}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              State
            </label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Zip
            </label>
            <input
              type="text"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            disabled={saving || !title.trim() || !date}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : isNew ? "Create" : "Update"}
          </button>
          <Link
            to="/events"
            className="rounded bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
