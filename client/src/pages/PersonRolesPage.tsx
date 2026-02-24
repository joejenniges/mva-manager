import { useState, useRef } from "react";
import { useEntities } from "../hooks/useEntities";
import EntityTable, { type Column } from "../components/EntityTable";
import TagBadge from "../components/TagBadge";
import ColorPicker from "../components/ColorPicker";
import { useToast } from "../components/Toast";
import { usePermissions } from "../permissions";
import useHotkeys from "../hooks/useHotkeys";
import useTableNavigation from "../hooks/useTableNavigation";

interface PersonRole {
  id: string;
  title: string;
  color: string;
}

export default function PersonRolesPage() {
  const { toast } = useToast();
  const { canEdit, canDelete } = usePermissions();
  const { data, total, page, loading, error, search, setPage, create, update, remove } =
    useEntities<PersonRole>("/api/v1/person-roles");
  const searchRef = useRef<HTMLInputElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  const tableNav = useTableNavigation({
    itemCount: data.length,
    onSelect: (i) => startEdit(data[i]),
  });

  useHotkeys({
    s: () => searchRef.current?.focus(),
    Escape: () => (document.activeElement as HTMLElement)?.blur(),
    n: () => newInputRef.current?.focus(),
    ...tableNav.hotkeys,
  });

  const [newTitle, setNewTitle] = useState("");
  const [newColor, setNewColor] = useState("#6b7280");
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editColor, setEditColor] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!newTitle.trim() || saving) return;
    setSaving(true);
    try {
      await create({ title: newTitle.trim(), color: newColor });
      setNewTitle("");
      setNewColor("#6b7280");
      toast("Role created", "success");
    } catch {
      toast("Failed to create role", "error");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(role: PersonRole) {
    setEditId(role.id);
    setEditTitle(role.title);
    setEditColor(role.color);
  }

  async function handleUpdate() {
    if (!editId || !editTitle.trim() || saving) return;
    setSaving(true);
    try {
      await update(editId, { title: editTitle.trim(), color: editColor });
      setEditId(null);
      toast("Role updated", "success");
    } catch {
      toast("Failed to update role", "error");
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setEditId(null);
  }

  const columns: Column<PersonRole>[] = [
    {
      key: "title",
      label: "Title",
      render: (row) =>
        editId === row.id ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleUpdate(); }
              if (e.key === "Escape") cancelEdit();
            }}
            className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
            autoFocus
          />
        ) : canEdit("person_roles") ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              startEdit(row);
            }}
            className="text-left text-gray-200 hover:text-blue-400"
          >
            {row.title}
          </button>
        ) : (
          <span className="text-gray-200">{row.title}</span>
        ),
    },
    {
      key: "color",
      label: "Color",
      render: (row) =>
        editId === row.id ? (
          <div className="flex items-center gap-2">
            <ColorPicker value={editColor} onChange={setEditColor} />
            <button
              onClick={handleUpdate}
              disabled={saving}
              className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={cancelEdit}
              className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        ) : (
          <TagBadge label={row.title} color={row.color} />
        ),
    },
  ];

  const createForm = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleCreate();
      }}
      className="flex items-center gap-2"
    >
      <input
        ref={newInputRef}
        type="text"
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreate(); } }}
        placeholder="New role title...  (N)"
        className="rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
      />
      <ColorPicker value={newColor} onChange={setNewColor} />
      <button
        type="submit"
        disabled={!newTitle.trim() || saving}
        className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
      >
        Add
      </button>
    </form>
  );

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold text-gray-100">
        Person Roles
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
        onDelete={canDelete("person_roles") ? async (id) => { try { await remove(id); toast("Role deleted", "success"); } catch { toast("Failed to delete role", "error"); } } : undefined}
        searchPlaceholder="Search roles...  (S)"
        header={canEdit("person_roles") ? createForm : undefined}
        searchInputRef={searchRef}
        selectedIndex={tableNav.selectedIndex}
      />
    </div>
  );
}
