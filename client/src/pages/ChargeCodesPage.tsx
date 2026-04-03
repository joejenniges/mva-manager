import { useState, useRef } from "react";
import { useEntities } from "../hooks/useEntities";
import EntityTable, { type Column } from "../components/EntityTable";
import { useToast } from "../components/Toast";
import { usePermissions } from "../permissions";
import useHotkeys from "../hooks/useHotkeys";
import useTableNavigation from "../hooks/useTableNavigation";

interface ChargeCode {
  id: string;
  code: string;
  description: string;
}

export default function ChargeCodesPage() {
  const { toast } = useToast();
  const { canEdit, canDelete } = usePermissions();
  const { data, total, page, loading, error, search, setPage, create, update, remove } =
    useEntities<ChargeCode>("/api/v1/charge-codes");
  const searchRef = useRef<HTMLInputElement>(null);
  const newCodeRef = useRef<HTMLInputElement>(null);

  const tableNav = useTableNavigation({
    itemCount: data.length,
    onSelect: (i) => startEdit(data[i]),
  });

  useHotkeys({
    s: () => searchRef.current?.focus(),
    Escape: () => { cancelEdit(); (document.activeElement as HTMLElement)?.blur(); },
    n: () => newCodeRef.current?.focus(),
    ...tableNav.hotkeys,
  });

  const [newCode, setNewCode] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!newCode.trim() || !newDescription.trim() || saving) return;
    setSaving(true);
    try {
      await create({ code: newCode.trim(), description: newDescription.trim() });
      setNewCode("");
      setNewDescription("");
      toast("Charge code created", "success");
    } catch {
      toast("Failed to create charge code", "error");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(cc: ChargeCode) {
    setEditId(cc.id);
    setEditCode(cc.code);
    setEditDescription(cc.description);
  }

  async function handleUpdate() {
    if (!editId || !editCode.trim() || !editDescription.trim() || saving) return;
    setSaving(true);
    try {
      await update(editId, { code: editCode.trim(), description: editDescription.trim() });
      setEditId(null);
      toast("Charge code updated", "success");
    } catch {
      toast("Failed to update charge code", "error");
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setEditId(null);
  }

  const columns: Column<ChargeCode>[] = [
    {
      key: "code",
      label: "Code",
      render: (row) =>
        editId === row.id ? (
          <input
            type="text"
            value={editCode}
            onChange={(e) => setEditCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleUpdate(); }
              if (e.key === "Escape") cancelEdit();
            }}
            className="w-32 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
            autoFocus
          />
        ) : canEdit("charge_codes") ? (
          <button
            onClick={(e) => { e.stopPropagation(); startEdit(row); }}
            className="text-left font-mono text-gray-200 hover:text-blue-400"
          >
            {row.code}
          </button>
        ) : (
          <span className="font-mono text-gray-200">{row.code}</span>
        ),
    },
    {
      key: "description",
      label: "Description",
      render: (row) =>
        editId === row.id ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleUpdate(); }
                if (e.key === "Escape") cancelEdit();
              }}
              className="flex-1 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
            />
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
          <span className="text-gray-300">{row.description}</span>
        ),
    },
  ];

  const createForm = (
    <form
      onSubmit={(e) => { e.preventDefault(); handleCreate(); }}
      className="flex items-center gap-2"
    >
      <input
        ref={newCodeRef}
        type="text"
        value={newCode}
        onChange={(e) => setNewCode(e.target.value)}
        placeholder="Code...  (N)"
        className="w-32 rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm font-mono text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
      />
      <input
        type="text"
        value={newDescription}
        onChange={(e) => setNewDescription(e.target.value)}
        placeholder="Description..."
        className="flex-1 rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={!newCode.trim() || !newDescription.trim() || saving}
        className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
      >
        Add
      </button>
    </form>
  );

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold text-gray-100">Charge Codes</h2>
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
        onDelete={canDelete("charge_codes") ? async (id) => { try { await remove(id); toast("Charge code deleted", "success"); } catch { toast("Failed to delete charge code", "error"); } } : undefined}
        searchPlaceholder="Search codes...  (S)"
        header={canEdit("charge_codes") ? createForm : undefined}
        searchInputRef={searchRef}
        selectedIndex={tableNav.selectedIndex}
      />
    </div>
  );
}
