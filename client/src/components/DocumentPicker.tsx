import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../api";
import DocumentViewer from "./DocumentViewer";
import { useToast } from "./Toast";

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface DocumentResult {
  id: string;
  title: string | null;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  documentType: { id: string; title: string; color: string } | null;
  documentAppointments: { appointmentId: string }[];
}

interface Props {
  appointmentId: string;
  onLink: (docId: string) => Promise<void>;
  onClose: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentPicker({ appointmentId, onLink, onClose }: Props) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<DocumentResult[]>([]);
  const [selected, setSelected] = useState<DocumentResult | null>(null);
  const [linking, setLinking] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchResults = useCallback((q: string) => {
    const params = new URLSearchParams({ excludeAppointmentId: appointmentId, limit: "20" });
    if (q.trim()) params.set("search", q.trim());
    api<{ data: DocumentResult[] }>(`/api/v1/documents?${params}`)
      .then((res) => setResults(res.data))
      .catch(() => {});
  }, [appointmentId]);

  // Fetch on mount
  useEffect(() => {
    fetchResults("");
  }, [fetchResults]);

  // Debounced search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(search), 300);
    return () => clearTimeout(debounceRef.current);
  }, [search, fetchResults]);

  // Focus search on mount
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  async function handleLink() {
    if (!selected || linking) return;
    setLinking(true);
    try {
      await onLink(selected.id);
      // Optimistic: remove from results
      setResults((prev) => prev.filter((d) => d.id !== selected.id));
      setSelected(null);
      toast("Document added to appointment", "success");
    } catch {
      toast("Failed to link document", "error");
    } finally {
      setLinking(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Tab" && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        ref={modalRef}
        className="flex h-[85vh] w-full max-w-7xl flex-col rounded-lg border border-gray-700 bg-gray-900"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-100">Attach Existing Document</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body: two-panel grid */}
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(280px,1fr)_2fr] divide-x divide-gray-700">
          {/* Left panel: search + results */}
          <div className="flex flex-col overflow-hidden">
            <div className="border-b border-gray-700 px-4 py-3">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title or filename..."
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {results.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  {search ? "No matching documents" : "No unlinked documents"}
                </div>
              ) : (
                results.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setSelected(doc)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-800 ${
                      selected?.id === doc.id ? "bg-gray-800" : ""
                    }`}
                  >
                    <div
                      className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: doc.documentType?.color || "#6b7280" }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-gray-200">
                        {doc.title || doc.originalFilename}
                      </div>
                      {doc.title && (
                        <div className="truncate text-xs text-gray-500">{doc.originalFilename}</div>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-xs text-gray-500">{formatFileSize(doc.fileSize)}</div>
                      <div className="text-xs text-gray-600">
                        {doc.documentAppointments.length} appointment{doc.documentAppointments.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right panel: preview + action */}
          <div className="flex flex-col overflow-hidden">
            {selected ? (
              <>
                <div className="min-h-0 flex-1 overflow-auto p-4">
                  <DocumentViewer
                    documentId={selected.id}
                    mimeType={selected.mimeType}
                    title={selected.title}
                    fillHeight
                  />
                </div>
                <div className="border-t border-gray-700 px-4 py-3">
                  <button
                    onClick={handleLink}
                    disabled={linking}
                    className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {linking ? "Adding..." : "Add to Appointment"}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
                Select a document to preview
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
