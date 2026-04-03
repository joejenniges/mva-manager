import type { InferSelectModel } from "drizzle-orm";
import type { users, sessions } from "./db/schema/index.js";

// --- Drizzle Row Types ---

export type UserRow = InferSelectModel<typeof users>;
export type SessionRow = InferSelectModel<typeof sessions>;

// --- Auth Types ---

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  isAdmin: boolean;
}

// --- Permission Types ---

export const ENTITY_TYPES = [
  "appointments", "persons", "organizations", "locations",
  "documents", "templates", "activities", "person_roles", "doc_types", "charge_codes", "events",
] as const;

export type EntityType = typeof ENTITY_TYPES[number];

export interface EventPermissions {
  edit: EntityType[];
  delete: EntityType[];
}

// --- API Types ---

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
