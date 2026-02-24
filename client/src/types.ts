export interface UserInfo {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  isAdmin: boolean;
}

export interface SessionResponse {
  token: string;
  expiresAt: string;
  user: UserInfo;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// --- Permission Types ---

export const ENTITY_TYPES = [
  "appointments", "persons", "organizations", "locations",
  "documents", "templates", "activities", "person_roles", "doc_types", "events",
] as const;

export type EntityType = typeof ENTITY_TYPES[number];

export interface EventPermissions {
  edit: EntityType[];
  delete: EntityType[];
}
