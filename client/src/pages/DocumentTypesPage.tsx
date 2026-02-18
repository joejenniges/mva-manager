import { useState, useRef } from "react";
import { useEntities } from "../hooks/useEntities";
import EntityTable, { type Column } from "../components/EntityTable";
import TagBadge from "../components/TagBadge";
import ColorPicker from "../components/ColorPicker";
import { useToast } from "../components/Toast";
import useHotkeys from "../hooks/useHotkeys";
import useTableNavigation from "../hooks/useTableNavigation";

interface DocumentType {
  id: string;
  title: string;
  color: string;
  namingTemplate: string | null;
}

const TEMPLATE_VARIABLES = [
  "{Patient}",
  "{DocumentType}",
  "{Organization}",
  "{Date}",
  "{EventDate}",
  "{Activity}",
];

export default function DocumentTypesPage() {
  const { toast } = useToast();
  const { data, total, page, loading, error, search, setPage, create, update, remove } =
    useEntities<DocumentType>("/api/v1/document-types");
  const searchRef = useRef<HTMLInputElement>(null);

  const tableNav = useTableNavigation({
    itemCount: data.length,
    onSelect: (i) => openEditModal(data[i]),
  });

  useHotkeys({
    s: () => searchRef.current?.focus(),
    Escape: () => {
      if (modalOpen) closeModal();
      else (document.activeElement as HTMLElement)?.blur();
    },
    n: () => openCreateModal(),
    ...tableNav.hotkeys,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState("");
  const [modalColor, setModalColor] = useState("#6b7280");
  const [modalTemplate, setModalTemplate] = useState("");
  const [saving, setSaving] = useState(false);
  const templateInputRef = useRef<HTMLInputElement>(null);

  function openCreateModal() {
    setEditingId(null);
    setModalTitle("");
    setModalColor("#6b7280");
    setModalTemplate("");
    setModalOpen(true);
  }

  function openEditModal(dt: DocumentType) {
    setEditingId(dt.id);
    setModalTitle(dt.title);
    setModalColor(dt.color);
    setModalTemplate(dt.namingTemplate ?? "");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
  }

  function insertVariable(variable: string) {
    const input = templateInputRef.current;
    if (!input) {
      setModalTemplate((prev) => prev + variable);
      return;
    }
    const start = input.selectionStart ?? modalTemplate.length;
    const end = input.selectionEnd ?? modalTemplate.length;
    const next = modalTemplate.slice(0, start) + variable + modalTemplate.slice(end);
    setModalTemplate(next);
    // Restore cursor position after the inserted variable
    requestAnimationFrame(() => {
      const pos = start + variable.length;
      input.setSelectionRange(pos, pos);
      input.focus();
    });
  }

  async function handleSave() {
    if (!modalTitle.trim() || saving) return;
    setSaving(true);
    try {
      const body = {
        title: modalTitle.trim(),
        color: modalColor,
        namingTemplate: modalTemplate.trim() || null,
      };
      if (editingId) {
        await update(editingId, body);
        toast("Document type updated", "success");
      } else {
        await create(body);
        toast("Document type created", "success");
      }
      closeModal();
    } catch {
      toast("Failed to save document type", "error");
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<DocumentType>[] = [
    {
      key: "title",
      label: "Title",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            openEditModal(row);
          }}
          className="text-left text-gray-200 hover:text-blue-400"
        >
          {row.title}
        </button>
      ),
    },
    {
      key: "color",
      label: "Color",
      render: (row) => <TagBadge label={row.title} color={row.color} />,
    },
    {
      key: "namingTemplate",
      label: "Naming Template",
      render: (row) => (
        <span className="font-mono text-xs text-gray-500">
          {row.namingTemplate || "--"}
        </span>
      ),
    },
  ];

  const addButton = (
    <button
      onClick={openCreateModal}
      className="shrink-0 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
    >
      New Document Type
      <kbd className="relative -top-px ml-1.5 rounded border border-blue-400/30 bg-blue-500/20 px-1 py-0.5 font-mono text-[10px]">N</kbd>
    </button>
  );

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold text-gray-100">
        Document Types
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
        onDelete={async (id) => { try { await remove(id); toast("Document type deleted", "success"); } catch { toast("Failed to delete document type", "error"); } }}
        searchPlaceholder="Search document types...  (S)"
        header={addButton}
        searchInputRef={searchRef}
        selectedIndex={tableNav.selectedIndex}
      />

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-lg rounded-lg border border-gray-700 bg-gray-900 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-100">
                {editingId ? "Edit Document Type" : "New Document Type"}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-200">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-gray-400">Title *</label>
                <input
                  type="text"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); handleSave(); }
                    if (e.key === "Escape") closeModal();
                  }}
                  autoFocus
                  className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g. Explanation of Benefits"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">Color</label>
                <ColorPicker value={modalColor} onChange={setModalColor} />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">Naming Template</label>
                <input
                  ref={templateInputRef}
                  type="text"
                  value={modalTemplate}
                  onChange={(e) => setModalTemplate(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); handleSave(); }
                    if (e.key === "Escape") closeModal();
                  }}
                  className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-sm text-gray-100 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="{Patient} {DocumentType} {Organization}"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {TEMPLATE_VARIABLES.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v)}
                      className="rounded border border-gray-600 bg-gray-800 px-2 py-1 font-mono text-xs text-gray-300 hover:border-blue-500 hover:text-blue-400 transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={!modalTitle.trim() || saving}
                  className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={closeModal}
                  className="rounded-md bg-gray-800 px-6 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
