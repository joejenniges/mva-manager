import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { api, getAuthHeaders, getStoredEventId } from "../api";
import type { PaginatedResponse } from "../types";
import TagBadge from "../components/TagBadge";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import { useToast } from "../components/Toast";
import { usePermissions } from "../permissions";
import FileDropzone from "../components/FileDropzone";
import DocumentViewer from "../components/DocumentViewer";
import useHotkeys from "../hooks/useHotkeys";
import useTableNavigation from "../hooks/useTableNavigation";

interface DocumentRow {
  id: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  title: string | null;
  documentType: { id: string; title: string; color: string } | null;
  documentAppointments: { appointment: { id: string; title: string | null } }[];
  createdAt: string;
}

export default function DocumentsPage() {
  const { toast } = useToast();
  const { canEdit, canDelete } = usePermissions();
  const [data, setData] = useState<DocumentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [unorganized, setUnorganized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewingDoc, setViewingDoc] = useState<DocumentRow | null>(null);
  const [uploading, setUploading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const limit = 25;

  const tableNav = useTableNavigation({
    itemCount: data.length,
    onSelect: (i) => setViewingDoc(data[i]),
  });

  useHotkeys({
    s: () => searchRef.current?.focus(),
    Escape: () => {
      if (viewingDoc) setViewingDoc(null);
      else (document.activeElement as HTMLElement)?.blur();
    },
    ...tableNav.hotkeys,
  });

  function load() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set("search", search);
    if (unorganized) params.set("unorganized", "true");

    api<PaginatedResponse<DocumentRow>>(`/api/v1/documents?${params}`)
      .then((res) => { setData(res.data); setTotal(res.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(load, [page, search, unorganized]);

  async function handleFileUpload(file: File) {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("appointmentIds", "[]");
    formData.append("personIds", "[]");
    formData.append("organizationIds", "[]");

    try {
      const headers: Record<string, string> = { ...getAuthHeaders() };
      // WHY: Must manually inject X-Event-Id for event scoping on FormData uploads
      const eventId = getStoredEventId();
      if (eventId) headers["X-Event-Id"] = eventId;

      const res = await fetch("/api/v1/documents", {
        method: "POST",
        headers,
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      load();
      toast("Document uploaded", "success");
    } catch {
      toast("Failed to upload document", "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api(`/api/v1/documents/${id}`, { method: "DELETE" });
      load();
      toast("Document deleted", "success");
    } catch {
      toast("Failed to delete document", "error");
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold text-gray-100">Documents</h2>

      {canEdit("documents") && (
        <div className="mb-4">
          <FileDropzone onFileSelect={handleFileUpload} />
          {uploading && <Spinner size="sm" className="mt-2" />}
        </div>
      )}

      <div className="mb-4 flex gap-3">
        <input
          ref={searchRef}
          type="text"
          placeholder="Search documents...  (S)"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
        />
        <label className="flex items-center gap-2 text-sm text-gray-400">
          <input
            type="checkbox"
            checked={unorganized}
            onChange={(e) => { setUnorganized(e.target.checked); setPage(1); }}
            className="rounded border-gray-700"
          />
          Unorganized only
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-gray-300">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Title / Filename</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Appointments</th>
              <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Size</th>
              <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Uploaded</th>
              {canDelete("documents") && <th className="w-20"></th>}
            </tr>
          </thead>
          <tbody className="bg-gray-900">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8"><Spinner className="py-4" /></td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={6}>
                <EmptyState
                  title="No documents found"
                  description={search || unorganized ? "Try different filters." : "Upload a document using the drop area above."}
                />
              </td></tr>
            ) : data.map((doc, i) => (
              <tr key={doc.id} data-row-index={i} className={`border-t border-gray-800 hover:bg-gray-800/50 ${tableNav.selectedIndex === i ? "bg-blue-900/20 outline outline-1 outline-blue-500/50" : ""}`}>
                <td
                  className="cursor-pointer px-4 py-3 text-gray-100"
                  onClick={() => setViewingDoc(doc)}
                >
                  {doc.title || doc.originalFilename}
                </td>
                <td className="px-4 py-3">
                  {doc.documentType && <TagBadge label={doc.documentType.title} color={doc.documentType.color} />}
                </td>
                <td className="hidden px-4 py-3 text-xs md:table-cell">
                  {doc.documentAppointments.length > 0
                    ? doc.documentAppointments.map((da, idx) => (
                        <span key={da.appointment.id}>
                          {idx > 0 && ", "}
                          <Link
                            to={`/appointments/${da.appointment.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-400 hover:underline"
                          >
                            {da.appointment.title || "Appointment"}
                          </Link>
                        </span>
                      ))
                    : <span className="text-yellow-500">Unorganized</span>
                  }
                </td>
                <td className="hidden px-4 py-3 text-gray-400 md:table-cell">{formatBytes(doc.fileSize)}</td>
                <td className="hidden px-4 py-3 text-gray-400 md:table-cell">{new Date(doc.createdAt).toLocaleDateString()}</td>
                {canDelete("documents") && (
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(doc.id)} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
          <span>{total} documents</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border border-gray-700 px-3 py-1 hover:bg-gray-800 disabled:opacity-50">Prev</button>
            <span className="px-2 py-1">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded border border-gray-700 px-3 py-1 hover:bg-gray-800 disabled:opacity-50">Next</button>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setViewingDoc(null)}>
          <div className="w-full max-w-4xl rounded-lg bg-gray-900 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-100">{viewingDoc.title || viewingDoc.originalFilename}</h3>
              <button onClick={() => setViewingDoc(null)} className="text-gray-400 hover:text-gray-200">Close</button>
            </div>
            <DocumentViewer documentId={viewingDoc.id} mimeType={viewingDoc.mimeType} title={viewingDoc.title} />
          </div>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
