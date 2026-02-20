import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import { api, getStoredToken, getStoredEventId } from "../api";
import TagBadge from "./TagBadge";
import Spinner from "./Spinner";
import FileDropzone from "./FileDropzone";
import type { FileDropzoneHandle } from "./FileDropzone";
import DocumentViewer from "./DocumentViewer";
import DocumentPicker from "./DocumentPicker";
import { useToast } from "./Toast";

interface DocType {
  id: string;
  title: string;
  color: string;
  namingTemplate: string | null;
}

interface AppointmentContext {
  datetime: string;
  patient: { id: string; name: string } | null;
  organization: { id: string; name: string; color: string | null } | null;
  appointmentActivities: { activityId: string; activity: { id: string; title: string; color: string } }[];
}

export interface AppointmentDocumentsHandle {
  scrollIntoView: () => void;
  openPicker: () => void;
  openFileDialog: () => void;
}

interface Props {
  appointmentId: string;
  appointment: AppointmentContext;
  onViewDocument?: (doc: any) => void;
}

const AppointmentDocuments = forwardRef<AppointmentDocumentsHandle, Props>(function AppointmentDocuments({ appointmentId, appointment, onViewDocument }, ref) {
  const { toast } = useToast();
  const dropzoneRef = useRef<FileDropzoneHandle>(null);
  const [docs, setDocs] = useState<any[]>([]);
  // WHY: Internal viewing state is only used when onViewDocument is not provided
  // (fallback modal). When the parent manages viewing (side panel), this stays null.
  const [viewing, setViewing] = useState<any>(null);

  // Upload form state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [docTypes, setDocTypes] = useState<DocType[]>([]);
  const [selectedDocTypeId, setSelectedDocTypeId] = useState<string>("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const loadDocs = useCallback(() => {
    api<any>(`/api/v1/documents?appointmentId=${appointmentId}&limit=100`).then((res) => setDocs(res.data));
  }, [appointmentId]);

  useEffect(loadDocs, [loadDocs]);

  // Fetch document types once for the upload form
  useEffect(() => {
    api<{ data: DocType[] }>("/api/v1/document-types?limit=100")
      .then((res) => setDocTypes(res.data))
      .catch(() => {});
  }, []);

  useImperativeHandle(ref, () => ({
    scrollIntoView: () => {
      const el = document.getElementById("appointment-documents-section");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    openPicker: () => setPickerOpen(true),
    openFileDialog: () => dropzoneRef.current?.open(),
  }));

  // WHY: When the user selects a document type that has a naming template,
  // auto-populate the title by substituting variables from appointment context.
  function applyNamingTemplate(docTypeId: string) {
    const docType = docTypes.find((dt) => dt.id === docTypeId);
    if (!docType?.namingTemplate) return;

    const now = new Date();
    const apptDate = new Date(appointment.datetime);
    const formatDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const vars: Record<string, string> = {
      "{Patient}": appointment.patient?.name || "",
      "{Organization}": appointment.organization?.name || "",
      "{DocumentType}": docType.title,
      "{Date}": formatDate(now),
      "{EventDate}": formatDate(apptDate),
      "{Activity}": appointment.appointmentActivities.map((aa) => aa.activity.title).join(", "),
    };

    let title = docType.namingTemplate;
    for (const [key, val] of Object.entries(vars)) {
      title = title.replaceAll(key, val);
    }
    setUploadTitle(title);
  }

  function handleFileSelect(file: File) {
    setPendingFile(file);
    setSelectedDocTypeId("");
    setUploadTitle("");
  }

  function handleDocTypeChange(docTypeId: string) {
    setSelectedDocTypeId(docTypeId);
    if (docTypeId) {
      applyNamingTemplate(docTypeId);
    }
  }

  function cancelUpload() {
    setPendingFile(null);
    setSelectedDocTypeId("");
    setUploadTitle("");
  }

  async function handleUpload() {
    if (!pendingFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", pendingFile);
    formData.append("appointmentIds", JSON.stringify([appointmentId]));
    formData.append("personIds", "[]");
    formData.append("organizationIds", "[]");
    if (selectedDocTypeId) formData.append("documentTypeId", selectedDocTypeId);
    if (uploadTitle.trim()) formData.append("title", uploadTitle.trim());

    try {
      const token = getStoredToken();
      const headers: Record<string, string> = {};
      if (import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS === "true") {
        headers["X-Dev-User"] = "user@example.com";
      } else if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      // WHY: FormData uploads can't use api() helper (it sets Content-Type to JSON).
      // Must manually inject X-Event-Id for event scoping.
      const eventId = getStoredEventId();
      if (eventId) headers["X-Event-Id"] = eventId;

      const res = await fetch("/api/v1/documents", {
        method: "POST",
        headers,
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      loadDocs();
      toast("Document uploaded", "success");
      cancelUpload();
    } catch {
      toast("Failed to upload document", "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleLinkDocument(docId: string) {
    await api(`/api/v1/documents/${docId}/appointments`, { body: { appointmentId } });
    loadDocs();
  }

  // Group documents by type
  const grouped = new Map<string, { type: string; color: string; docs: any[] }>();
  const ungrouped: any[] = [];

  for (const doc of docs) {
    if (doc.documentType) {
      const key = doc.documentType.id;
      if (!grouped.has(key)) {
        grouped.set(key, { type: doc.documentType.title, color: doc.documentType.color, docs: [] });
      }
      grouped.get(key)!.docs.push(doc);
    } else {
      ungrouped.push(doc);
    }
  }

  return (
    <div id="appointment-documents-section">
      <h3 className="mb-3 text-sm font-medium uppercase text-gray-500">Documents</h3>

      {!pendingFile ? (
        <div className="flex gap-3">
          <div className="flex-1">
            <FileDropzone ref={dropzoneRef} onFileSelect={handleFileSelect} />
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="rounded-lg border-2 border-dashed border-gray-700 px-4 text-sm text-gray-400 transition-colors hover:border-gray-600 hover:text-gray-300"
          >
            Attach Existing
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-gray-300">{pendingFile.name}</span>
            <button
              type="button"
              onClick={cancelUpload}
              className="text-sm text-gray-400 hover:text-gray-200"
            >
              Cancel
            </button>
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-sm text-gray-400">Document Type</label>
            <select
              value={selectedDocTypeId}
              onChange={(e) => handleDocTypeChange(e.target.value)}
              className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
            >
              <option value="">None</option>
              {docTypes.map((dt) => (
                <option key={dt.id} value={dt.id}>{dt.title}</option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-sm text-gray-400">Title</label>
            <input
              type="text"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder={pendingFile.name}
              className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      )}

      {docs.length > 0 && (
        <div className="mt-4 space-y-4">
          {[...grouped.values()].map((group) => (
            <div key={group.type}>
              <div className="mb-2 flex items-center gap-2">
                <TagBadge label={group.type} color={group.color} />
              </div>
              <div className="space-y-1">
                {group.docs.map((doc: any) => (
                  <DocumentRow key={doc.id} doc={doc} appointmentId={appointmentId} docTypes={docTypes} onView={() => onViewDocument ? onViewDocument(doc) : setViewing(doc)} onUpdate={loadDocs} />
                ))}
              </div>
            </div>
          ))}
          {ungrouped.length > 0 && (
            <div>
              <div className="mb-2 text-xs uppercase text-gray-500">Other</div>
              <div className="space-y-1">
                {ungrouped.map((doc: any) => (
                  <DocumentRow key={doc.id} doc={doc} appointmentId={appointmentId} docTypes={docTypes} onView={() => onViewDocument ? onViewDocument(doc) : setViewing(doc)} onUpdate={loadDocs} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fallback modal -- only used when parent doesn't handle viewing (no onViewDocument) */}
      {!onViewDocument && viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setViewing(null)}>
          <div className="w-full max-w-4xl rounded-lg bg-gray-900 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-100">{viewing.title || viewing.originalFilename}</h3>
              <button onClick={() => setViewing(null)} className="text-gray-400 hover:text-gray-200">Close</button>
            </div>
            <DocumentViewer documentId={viewing.id} mimeType={viewing.mimeType} title={viewing.title} />
          </div>
        </div>
      )}

      {pickerOpen && (
        <DocumentPicker
          appointmentId={appointmentId}
          onLink={handleLinkDocument}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
});

export default AppointmentDocuments;

// WHY: Inline DocumentRow instead of a separate file - it's tightly coupled
// to AppointmentDocuments' state (onView, onUpdate). Includes rename + unlink actions.
// WHY unlink instead of delete: Documents can now be shared across appointments.
// Removing from one appointment shouldn't delete the file -- just removes the junction row.
function DocumentRow({ doc, appointmentId, docTypes, onView, onUpdate }: { doc: any; appointmentId: string; docTypes: DocType[]; onView: () => void; onUpdate: () => void }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editTypeId, setEditTypeId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [removeState, setRemoveState] = useState<"idle" | "confirm" | "removing">("idle");

  function startEdit() {
    setEditTitle(doc.title || doc.originalFilename);
    setEditTypeId(doc.documentType?.id || "");
    setEditing(true);
  }

  async function saveEdit() {
    if (saving) return;
    const trimmedTitle = editTitle.trim();
    const titleChanged = trimmedTitle && trimmedTitle !== (doc.title || doc.originalFilename);
    const typeChanged = editTypeId !== (doc.documentType?.id || "");

    if (!titleChanged && !typeChanged) {
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, any> = {};
      if (titleChanged) body.title = trimmedTitle;
      // WHY: Changing document type should NOT auto-rename from template.
      // Only sends documentTypeId - title stays as-is unless user explicitly changed it.
      if (typeChanged) body.documentTypeId = editTypeId || null;
      await api(`/api/v1/documents/${doc.id}`, { method: "PATCH", body });
      toast("Document updated", "success");
      onUpdate();
    } catch {
      toast("Failed to update document", "error");
    }
    setSaving(false);
    setEditing(false);
  }

  async function handleRemove() {
    if (removeState === "idle") { setRemoveState("confirm"); return; }
    if (removeState !== "confirm") return;
    setRemoveState("removing");
    try {
      await api(`/api/v1/documents/${doc.id}/appointments/${appointmentId}`, { method: "DELETE" });
      toast("Document removed from appointment", "success");
      onUpdate();
    } catch {
      toast("Failed to remove document", "error");
      setRemoveState("idle");
    }
  }

  const createdAt = doc.createdAt ? new Date(doc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

  return (
    <div className="group flex items-center gap-2 rounded px-3 py-2 hover:bg-gray-800">
      {/* Color dot based on doc type */}
      <div
        className="h-2 w-2 flex-shrink-0 rounded-full"
        style={{ backgroundColor: doc.documentType?.color || "#6b7280" }}
      />

      {editing ? (
        <div className="flex flex-1 items-center gap-2">
          <select
            value={editTypeId}
            onChange={(e) => setEditTypeId(e.target.value)}
            className="rounded border border-gray-600 bg-gray-900 px-1.5 py-0.5 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
          >
            <option value="">No type</option>
            {docTypes.map((dt) => (
              <option key={dt.id} value={dt.id}>{dt.title}</option>
            ))}
          </select>
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
            className="flex-1 rounded border border-gray-600 bg-gray-900 px-2 py-0.5 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
          />
          <button onClick={saveEdit} disabled={saving} className="text-xs text-blue-400 hover:text-blue-300">
            {saving ? "..." : "Save"}
          </button>
          <button onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:text-gray-300">
            Cancel
          </button>
        </div>
      ) : (
        <button onClick={onView} className="flex-1 text-left text-sm text-gray-300 hover:text-gray-100">
          {doc.title || doc.originalFilename}
        </button>
      )}

      {!editing && createdAt && <span className="text-xs text-gray-600">{createdAt}</span>}

      {/* Actions - visible on hover */}
      {!editing && (
      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button onClick={startEdit} className="rounded p-1 text-gray-500 hover:text-gray-300" title="Edit">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        {removeState === "removing" ? (
          <div className="p-1"><Spinner size="sm" /></div>
        ) : (
          <button
            onClick={handleRemove}
            onBlur={() => { if (removeState === "confirm") setRemoveState("idle"); }}
            className={`rounded p-1 ${removeState === "confirm" ? "font-bold text-red-400" : "text-gray-500 hover:text-red-400"}`}
            title={removeState === "confirm" ? "Click again to confirm" : "Remove from appointment"}
          >
            {removeState === "confirm" ? (
              <span className="flex h-3.5 w-3.5 items-center justify-center text-xs">?</span>
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
        )}
      </div>
      )}
    </div>
  );
}
