import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useEntities } from "../hooks/useEntities";
import EntityTable, { type Column } from "../components/EntityTable";
import { useToast } from "../components/Toast";
import useHotkeys from "../hooks/useHotkeys";
import useTableNavigation from "../hooks/useTableNavigation";

interface Location {
  id: string;
  title: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

export default function LocationsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, total, page, loading, error, search, setPage, remove } =
    useEntities<Location>("/api/v1/locations");
  const searchRef = useRef<HTMLInputElement>(null);

  const tableNav = useTableNavigation({
    itemCount: data.length,
    onSelect: (i) => navigate(`/locations/${data[i].id}`),
  });

  useHotkeys({
    s: () => searchRef.current?.focus(),
    Escape: () => (document.activeElement as HTMLElement)?.blur(),
    n: () => navigate("/locations/new"),
    ...tableNav.hotkeys,
  });

  const columns: Column<Location>[] = [
    { key: "title", label: "Title" },
    { key: "address", label: "Address", render: (row) => row.address || "--" },
    { key: "city", label: "City", render: (row) => row.city || "--", hideOnMobile: true },
    { key: "state", label: "State", render: (row) => row.state || "--", hideOnMobile: true },
    { key: "zip", label: "Zip", render: (row) => row.zip || "--", hideOnMobile: true },
  ];

  const addButton = (
    <button
      onClick={() => navigate("/locations/new")}
      className="shrink-0 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
    >
      New Location
      <kbd className="relative -top-px ml-1.5 hidden rounded border border-blue-400/30 bg-blue-500/20 px-1 py-0.5 font-mono text-[10px] md:inline">N</kbd>
    </button>
  );

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold text-gray-100">Locations</h2>
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
        onDelete={async (id) => { try { await remove(id); toast("Location deleted", "success"); } catch { toast("Failed to delete location", "error"); } }}
        onRowClick={(row) => navigate(`/locations/${row.id}`)}
        searchPlaceholder="Search locations...  (S)"
        header={addButton}
        searchInputRef={searchRef}
        selectedIndex={tableNav.selectedIndex}
      />
    </div>
  );
}
