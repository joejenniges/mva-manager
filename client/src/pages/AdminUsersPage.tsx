import { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../api";
import { usePermissions } from "../permissions";
import { useEvent } from "../event";
import { useToast } from "../components/Toast";
import Spinner from "../components/Spinner";
import { ENTITY_TYPES, type EntityType, type EventPermissions } from "../types";

interface UserRow {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  createdAt: string;
}

interface EventAccessRow {
  id: string;
  eventId: string;
  eventTitle: string;
  permissions: EventPermissions;
  defaultPersonId: string | null;
  defaultPersonName: string | null;
}

interface PatientOption {
  id: string;
  name: string;
  color: string | null;
}

const ENTITY_LABELS: Record<EntityType, string> = {
  appointments: "Appointments",
  persons: "Persons",
  organizations: "Organizations",
  locations: "Locations",
  documents: "Documents",
  templates: "Templates",
  activities: "Activities",
  person_roles: "Person Roles",
  doc_types: "Doc Types",
  charge_codes: "Charge Codes",
  events: "Events",
};

export default function AdminUsersPage() {
  const { isAdmin } = usePermissions();
  const { events } = useEvent();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [adding, setAdding] = useState(false);

  // Delete user state: tracks which user ID is in "confirm" or "deleting" state
  const [deleteState, setDeleteState] = useState<{ id: string; state: "confirm" | "deleting" } | null>(null);

  // Selected user for access management
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [accessRows, setAccessRows] = useState<EventAccessRow[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);

  // Permission editor state
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<EventPermissions>({ edit: [], delete: [] });
  const [editDefaultPersonId, setEditDefaultPersonId] = useState<string | null>(null);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(() => {
    setLoading(true);
    api<{ data: UserRow[] }>("/api/v1/admin/users")
      .then((res) => setUsers(res.data))
      .catch(() => toast("Failed to load users", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(loadUsers, [loadUsers]);

  const loadAccess = useCallback((userId: string) => {
    setAccessLoading(true);
    api<{ data: EventAccessRow[] }>(`/api/v1/admin/users/${userId}/access`)
      .then((res) => setAccessRows(res.data))
      .catch(() => toast("Failed to load access", "error"))
      .finally(() => setAccessLoading(false));
  }, [toast]);

  useEffect(() => {
    if (selectedUser) loadAccess(selectedUser.id);
    else setAccessRows([]);
  }, [selectedUser, loadAccess]);

  if (!isAdmin) return <Navigate to="/" replace />;

  async function handleDeleteUser(user: UserRow) {
    if (!deleteState || deleteState.id !== user.id) {
      setDeleteState({ id: user.id, state: "confirm" });
      return;
    }
    if (deleteState.state !== "confirm") return;
    setDeleteState({ id: user.id, state: "deleting" });
    try {
      await api(`/api/v1/admin/users/${user.id}`, { method: "DELETE" });
      toast("User deleted", "success");
      if (selectedUser?.id === user.id) setSelectedUser(null);
      setDeleteState(null);
      loadUsers();
    } catch {
      toast("Failed to delete user", "error");
      setDeleteState(null);
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (!addEmail.trim() || adding) return;
    setAdding(true);
    try {
      await api("/api/v1/admin/users", {
        method: "POST",
        body: { email: addEmail.trim(), name: addName.trim() || undefined },
      });
      setAddEmail("");
      setAddName("");
      toast("User added", "success");
      loadUsers();
    } catch {
      toast("Failed to add user", "error");
    } finally {
      setAdding(false);
    }
  }

  function startEditAccess(eventId: string) {
    const existing = accessRows.find((r) => r.eventId === eventId);
    setEditingEventId(eventId);
    setEditPerms(existing ? { ...existing.permissions } : { edit: [], delete: [] });
    setEditDefaultPersonId(existing?.defaultPersonId ?? null);
    // Fetch patients for this event
    api<{ data: PatientOption[] }>(`/api/v1/admin/events/${eventId}/patients`)
      .then((res) => setPatients(res.data))
      .catch(() => setPatients([]));
  }

  function togglePerm(action: "edit" | "delete", entity: EntityType) {
    setEditPerms((prev) => {
      const arr = prev[action];
      const next = arr.includes(entity)
        ? arr.filter((e) => e !== entity)
        : [...arr, entity];
      return { ...prev, [action]: next };
    });
  }

  function applyPreset(preset: "read_only" | "full_edit" | "full_access") {
    if (preset === "read_only") {
      setEditPerms({ edit: [], delete: [] });
    } else if (preset === "full_edit") {
      setEditPerms({ edit: [...ENTITY_TYPES], delete: [] });
    } else {
      setEditPerms({ edit: [...ENTITY_TYPES], delete: [...ENTITY_TYPES] });
    }
  }

  async function saveAccess() {
    if (!selectedUser || !editingEventId || saving) return;
    setSaving(true);
    try {
      await api(`/api/v1/admin/users/${selectedUser.id}/access/${editingEventId}`, {
        method: "PUT",
        body: { permissions: editPerms, defaultPersonId: editDefaultPersonId },
      });
      toast("Permissions saved", "success");
      setEditingEventId(null);
      loadAccess(selectedUser.id);
    } catch {
      toast("Failed to save permissions", "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeAccess(eventId: string) {
    if (!selectedUser) return;
    try {
      await api(`/api/v1/admin/users/${selectedUser.id}/access/${eventId}`, {
        method: "DELETE",
      });
      toast("Access removed", "success");
      loadAccess(selectedUser.id);
    } catch {
      toast("Failed to remove access", "error");
    }
  }

  return (
    <div className="flex gap-6">
      {/* Left: User list */}
      <div className="w-80 shrink-0">
        <h2 className="mb-4 text-2xl font-semibold text-gray-100">Users</h2>

        <form onSubmit={handleAddUser} className="mb-4 space-y-2">
          <input
            type="email"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            placeholder="Email address"
            required
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
          />
          <input
            type="text"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            placeholder="Name (optional)"
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!addEmail.trim() || adding}
            className="w-full rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {adding ? "Adding..." : "Add User"}
          </button>
        </form>

        {loading ? (
          <Spinner className="py-8" />
        ) : (
          <div className="space-y-1">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedUser(u)}
                  className={`min-w-0 flex-1 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    selectedUser?.id === u.id
                      ? "bg-gray-800 text-blue-400"
                      : "text-gray-300 hover:bg-gray-800/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{u.name}</span>
                    {u.isAdmin && (
                      <span className="shrink-0 rounded bg-amber-600/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                        Admin
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-gray-500">{u.email}</div>
                </button>
                {!u.isAdmin && (
                  deleteState?.id === u.id && deleteState.state === "deleting" ? (
                    <div className="shrink-0 p-1.5">
                      <Spinner size="sm" />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDeleteUser(u)}
                      onBlur={() => { if (deleteState?.id === u.id && deleteState.state === "confirm") setDeleteState(null); }}
                      title={deleteState?.id === u.id && deleteState.state === "confirm" ? "Click again to confirm" : "Delete user"}
                      className={`shrink-0 rounded p-1.5 ${
                        deleteState?.id === u.id && deleteState.state === "confirm"
                          ? "font-bold text-red-400"
                          : "text-gray-600 hover:bg-red-900/30 hover:text-red-400"
                      }`}
                    >
                      {deleteState?.id === u.id && deleteState.state === "confirm" ? (
                        <span className="flex h-4 w-4 items-center justify-center text-sm">?</span>
                      ) : (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Access management */}
      <div className="min-w-0 flex-1">
        {!selectedUser ? (
          <div className="flex h-40 items-center justify-center text-gray-500">
            Select a user to manage their event access
          </div>
        ) : (
          <div>
            <h3 className="mb-4 text-lg font-semibold text-gray-100">
              {selectedUser.name}
              <span className="ml-2 text-sm font-normal text-gray-500">{selectedUser.email}</span>
            </h3>

            {selectedUser.isAdmin && (
              <div className="mb-4 rounded-lg border border-amber-600/30 bg-amber-950/20 px-4 py-2 text-sm text-amber-300">
                Admin — has full access to everything. Patient linking below still applies for dashboard.
              </div>
            )}

            {/* Existing access */}
            {accessLoading ? (
              <Spinner className="py-4" />
            ) : (
              <>
                <div className="mb-4">
                  <h4 className="mb-2 text-sm font-medium text-gray-300">Event Access</h4>
                  {accessRows.length === 0 ? (
                    <p className="text-sm text-gray-500">No event access assigned. This user cannot log in.</p>
                  ) : (
                    <div className="space-y-2">
                      {accessRows.map((row) => (
                        <div key={row.id} className="rounded-lg border border-gray-700 bg-gray-900 p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-100">{row.eventTitle}</span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEditAccess(row.eventId)}
                                className="text-xs text-blue-400 hover:text-blue-300"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => removeAccess(row.eventId)}
                                className="text-xs text-red-400 hover:text-red-300"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {row.permissions.edit.length === 0 && row.permissions.delete.length === 0
                              ? "Read only"
                              : `Edit: ${row.permissions.edit.length}, Delete: ${row.permissions.delete.length}`}
                            {row.defaultPersonName && ` · Patient: ${row.defaultPersonName}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add access to new event */}
                {(() => {
                  const assignedEventIds = new Set(accessRows.map((r) => r.eventId));
                  const unassigned = events.filter((e) => !assignedEventIds.has(e.id));
                  if (unassigned.length === 0) return null;
                  return (
                    <div className="mb-4">
                      <h4 className="mb-2 text-sm font-medium text-gray-300">Grant Access</h4>
                      <div className="flex flex-wrap gap-2">
                        {unassigned.map((evt) => (
                          <button
                            key={evt.id}
                            onClick={() => startEditAccess(evt.id)}
                            className="rounded border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:border-blue-500 hover:text-blue-400"
                          >
                            + {evt.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}

            {/* Permission editor modal */}
            {editingEventId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEditingEventId(null)}>
                <div className="w-full max-w-xl rounded-lg border border-gray-700 bg-gray-900 p-6" onClick={(e) => e.stopPropagation()}>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-100">
                      Permissions: {events.find((e) => e.id === editingEventId)?.title}
                    </h3>
                    <button onClick={() => setEditingEventId(null)} className="text-gray-400 hover:text-gray-200">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Default Patient */}
                  <div className="mb-4">
                    <label className="mb-1 block text-xs font-medium text-gray-400">Default Patient</label>
                    <select
                      value={editDefaultPersonId || ""}
                      onChange={(e) => setEditDefaultPersonId(e.target.value || null)}
                      className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">None</option>
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Presets */}
                  <div className="mb-4 flex gap-2">
                    <button onClick={() => applyPreset("read_only")} className="rounded border border-gray-700 px-3 py-1 text-xs text-gray-300 hover:bg-gray-800">
                      Read Only
                    </button>
                    <button onClick={() => applyPreset("full_edit")} className="rounded border border-gray-700 px-3 py-1 text-xs text-gray-300 hover:bg-gray-800">
                      Full Edit
                    </button>
                    <button onClick={() => applyPreset("full_access")} className="rounded border border-gray-700 px-3 py-1 text-xs text-gray-300 hover:bg-gray-800">
                      Full Access
                    </button>
                  </div>

                  {/* Checkbox grid */}
                  <div className="overflow-hidden rounded border border-gray-700">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-800">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Entity</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-400">Edit</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-400">Delete</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ENTITY_TYPES.map((entity) => (
                          <tr key={entity} className="border-t border-gray-800">
                            <td className="px-3 py-2 text-gray-300">{ENTITY_LABELS[entity]}</td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={editPerms.edit.includes(entity)}
                                onChange={() => togglePerm("edit", entity)}
                                className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={editPerms.delete.includes(entity)}
                                onChange={() => togglePerm("delete", entity)}
                                className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={saveAccess}
                      disabled={saving}
                      className="rounded bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingEventId(null)}
                      className="rounded bg-gray-800 px-6 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
