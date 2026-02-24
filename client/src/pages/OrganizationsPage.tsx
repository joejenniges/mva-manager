import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useEntities } from "../hooks/useEntities";
import EntityTable, { type Column } from "../components/EntityTable";
import { useToast } from "../components/Toast";
import { usePermissions } from "../permissions";
import useHotkeys from "../hooks/useHotkeys";
import useTableNavigation from "../hooks/useTableNavigation";

interface Organization {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  color: string | null;
  organizationLocations: { locationId: string }[];
  organizationPersons: { personId: string }[];
}

export default function OrganizationsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canEdit, canDelete } = usePermissions();
  const { data, total, page, loading, error, search, setPage, remove } =
    useEntities<Organization>("/api/v1/organizations");
  const searchRef = useRef<HTMLInputElement>(null);

  const tableNav = useTableNavigation({
    itemCount: data.length,
    onSelect: (i) => navigate(`/organizations/${data[i].id}`),
  });

  useHotkeys({
    s: () => searchRef.current?.focus(),
    Escape: () => (document.activeElement as HTMLElement)?.blur(),
    n: () => navigate("/organizations/new"),
    ...tableNav.hotkeys,
  });

  const columns: Column<Organization>[] = [
    {
      key: "name",
      label: "Name",
      render: (row) => (
        <span className="flex items-center gap-2">
          {row.color && <span className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: row.color }} />}
          <span className="text-gray-100">{row.name}</span>
        </span>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      render: (row) => row.phone || "--",
    },
    {
      key: "email",
      label: "Email",
      render: (row) => row.email || "--",
      hideOnMobile: true,
    },
    {
      key: "locations",
      label: "Locations",
      render: (row) => (
        <span className="text-gray-400">
          {row.organizationLocations?.length ?? 0}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: "providers",
      label: "Providers",
      render: (row) => (
        <span className="text-gray-400">
          {row.organizationPersons?.length ?? 0}
        </span>
      ),
      hideOnMobile: true,
    },
  ];

  const addButton = canEdit("organizations") ? (
    <button
      onClick={() => navigate("/organizations/new")}
      className="shrink-0 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
    >
      New Organization
      <kbd className="relative -top-px ml-1.5 hidden rounded border border-blue-400/30 bg-blue-500/20 px-1 py-0.5 font-mono text-[10px] md:inline">N</kbd>
    </button>
  ) : null;

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold text-gray-100">
        Organizations
      </h2>
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
        onDelete={canDelete("organizations") ? async (id) => { try { await remove(id); toast("Organization deleted", "success"); } catch { toast("Failed to delete organization", "error"); } } : undefined}
        onRowClick={(row) => navigate(`/organizations/${row.id}`)}
        searchPlaceholder="Search organizations...  (S)"
        header={addButton}
        searchInputRef={searchRef}
        selectedIndex={tableNav.selectedIndex}
      />
    </div>
  );
}
