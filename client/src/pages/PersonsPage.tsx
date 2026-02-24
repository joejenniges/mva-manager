import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useEntities } from "../hooks/useEntities";
import EntityTable, { type Column } from "../components/EntityTable";
import TagBadge from "../components/TagBadge";
import { useToast } from "../components/Toast";
import { usePermissions } from "../permissions";
import useHotkeys from "../hooks/useHotkeys";
import useTableNavigation from "../hooks/useTableNavigation";

interface PersonRole {
  id: string;
  title: string;
  color: string;
}

interface Person {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  isPatient: boolean;
  color: string | null;
  personPersonRoles: { personRole: PersonRole }[];
}

export default function PersonsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canEdit, canDelete } = usePermissions();
  const { data, total, page, loading, error, search, setPage, remove } =
    useEntities<Person>("/api/v1/persons");
  const searchRef = useRef<HTMLInputElement>(null);

  const tableNav = useTableNavigation({
    itemCount: data.length,
    onSelect: (i) => navigate(`/persons/${data[i].id}`),
  });

  useHotkeys({
    s: () => searchRef.current?.focus(),
    Escape: () => (document.activeElement as HTMLElement)?.blur(),
    n: () => navigate("/persons/new"),
    ...tableNav.hotkeys,
  });

  const columns: Column<Person>[] = [
    {
      key: "name",
      label: "Name",
      render: (row) => (
        <span className="flex items-center gap-2">
          {row.color && <span className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: row.color }} />}
          <span className="text-gray-100">{row.name}</span>
          {row.isPatient && (
            <span className="rounded bg-blue-600/20 px-1.5 py-0.5 text-xs font-medium text-blue-400">
              Patient
            </span>
          )}
        </span>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      render: (row) => row.phone || "--",
      hideOnMobile: true,
    },
    {
      key: "email",
      label: "Email",
      render: (row) => row.email || "--",
      hideOnMobile: true,
    },
    {
      key: "roles",
      label: "Roles",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.personPersonRoles?.map(({ personRole }) => (
            <TagBadge
              key={personRole.id}
              label={personRole.title}
              color={personRole.color}
            />
          ))}
        </div>
      ),
    },
  ];

  const addButton = canEdit("persons") ? (
    <button
      onClick={() => navigate("/persons/new")}
      className="shrink-0 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
    >
      New Person
      <kbd className="relative -top-px ml-1.5 hidden rounded border border-blue-400/30 bg-blue-500/20 px-1 py-0.5 font-mono text-[10px] md:inline">N</kbd>
    </button>
  ) : null;

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold text-gray-100">Persons</h2>
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
        onDelete={canDelete("persons") ? async (id) => { try { await remove(id); toast("Person deleted", "success"); } catch { toast("Failed to delete person", "error"); } } : undefined}
        onRowClick={(row) => navigate(`/persons/${row.id}`)}
        searchPlaceholder="Search persons...  (S)"
        header={addButton}
        searchInputRef={searchRef}
        selectedIndex={tableNav.selectedIndex}
      />
    </div>
  );
}
