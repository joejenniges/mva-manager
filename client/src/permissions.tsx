import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { api } from "./api";
import { useAuth } from "./auth";
import { useEvent } from "./event";
import type { EntityType, EventPermissions } from "./types";

interface PermissionsState {
  isAdmin: boolean;
  permissions: EventPermissions | null;
  canEdit: (entity: EntityType) => boolean;
  canDelete: (entity: EntityType) => boolean;
  loading: boolean;
}

const PermissionsContext = createContext<PermissionsState>({
  isAdmin: false,
  permissions: null,
  canEdit: () => false,
  canDelete: () => false,
  loading: true,
});

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { activeEvent } = useEvent();
  const [permissions, setPermissions] = useState<EventPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.isAdmin ?? false;

  useEffect(() => {
    if (!user) {
      setPermissions(null);
      setLoading(false);
      return;
    }

    // Admins don't need permission lookups
    if (isAdmin) {
      setPermissions(null);
      setLoading(false);
      return;
    }

    if (!activeEvent) {
      setPermissions(null);
      setLoading(false);
      return;
    }

    // Fetch permissions from /me which now includes them
    setLoading(true);
    api<{ permissions: EventPermissions | null }>("/api/v1/me")
      .then((data) => {
        setPermissions(data.permissions);
      })
      .catch(() => {
        setPermissions(null);
      })
      .finally(() => setLoading(false));
  }, [user, isAdmin, activeEvent?.id]);

  function canEdit(entity: EntityType): boolean {
    if (isAdmin) return true;
    if (!permissions) return false;
    return permissions.edit.includes(entity);
  }

  function canDelete(entity: EntityType): boolean {
    if (isAdmin) return true;
    if (!permissions) return false;
    return permissions.delete.includes(entity);
  }

  return (
    <PermissionsContext.Provider value={{ isAdmin, permissions, canEdit, canDelete, loading }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
