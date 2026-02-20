import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useEntities } from "../hooks/useEntities";
import EntityTable, { type Column } from "../components/EntityTable";
import { useToast } from "../components/Toast";
import { useEvent } from "../event";
import useHotkeys from "../hooks/useHotkeys";
import useTableNavigation from "../hooks/useTableNavigation";

interface EventRow {
  id: string;
  title: string;
  date: string;
  address: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
}

export default function EventsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeEvent, refreshEvents } = useEvent();
  const { data, total, page, loading, error, search, setPage, remove } =
    useEntities<EventRow>("/api/v1/events");
  const searchRef = useRef<HTMLInputElement>(null);

  const tableNav = useTableNavigation({
    itemCount: data.length,
    onSelect: (i) => navigate(`/events/${data[i].id}`),
  });

  useHotkeys({
    s: () => searchRef.current?.focus(),
    Escape: () => (document.activeElement as HTMLElement)?.blur(),
    n: () => navigate("/events/new"),
    ...tableNav.hotkeys,
  });

  const columns: Column<EventRow>[] = [
    {
      key: "title",
      label: "Title",
      render: (row) => (
        <span className="flex items-center gap-2">
          {row.title}
          {activeEvent?.id === row.id && (
            <span className="rounded bg-blue-600/20 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
              Active
            </span>
          )}
        </span>
      ),
    },
    {
      key: "date",
      label: "Date",
      render: (row) =>
        row.date
          ? new Date(row.date + "T00:00:00").toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "--",
    },
    {
      key: "city",
      label: "Location",
      render: (row) => {
        const parts = [row.city, row.state].filter(Boolean);
        return parts.length > 0 ? parts.join(", ") : "--";
      },
      hideOnMobile: true,
    },
    {
      key: "notes",
      label: "Notes",
      render: (row) =>
        row.notes ? (row.notes.length > 60 ? row.notes.slice(0, 60) + "..." : row.notes) : "--",
      hideOnMobile: true,
    },
  ];

  const addButton = (
    <button
      onClick={() => navigate("/events/new")}
      className="shrink-0 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
    >
      New Event
      <kbd className="relative -top-px ml-1.5 hidden rounded border border-blue-400/30 bg-blue-500/20 px-1 py-0.5 font-mono text-[10px] md:inline">N</kbd>
    </button>
  );

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold text-gray-100">Events</h2>
      {error && (
        <div className="mb-4 rounded border border-red-600/50 bg-red-600/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}
      <EntityTable
        columns={columns}
        data={data}
        loading={loading}
        total={total}
        page={page}
        limit={25}
        onPageChange={setPage}
        onSearch={search}
        onDelete={async (id) => {
          try {
            await remove(id);
            refreshEvents();
            toast("Event deleted", "success");
          } catch {
            toast("Failed to delete event", "error");
          }
        }}
        onRowClick={(row) => navigate(`/events/${row.id}`)}
        searchPlaceholder="Search events...  (S)"
        header={addButton}
        searchInputRef={searchRef}
        selectedIndex={tableNav.selectedIndex}
      />
    </div>
  );
}
