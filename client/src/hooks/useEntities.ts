import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../api";
import type { PaginatedResponse } from "../types";

interface UseEntitiesReturn<T> {
  data: T[];
  total: number;
  page: number;
  loading: boolean;
  error: string | null;
  search: (query: string) => void;
  setPage: (n: number) => void;
  reload: () => void;
  create: (body: Record<string, unknown>) => Promise<T>;
  update: (id: string, body: Record<string, unknown>) => Promise<T>;
  remove: (id: string) => Promise<void>;
}

const DEFAULT_LIMIT = 25;

export function useEntities<T = Record<string, unknown>>(
  baseUrl: string,
  limit: number = DEFAULT_LIMIT,
): UseEntitiesReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (searchQuery) params.set("search", searchQuery);

      const result = await api<PaginatedResponse<T>>(
        `${baseUrl}?${params.toString()}`,
      );
      if (mountedRef.current) {
        setData(result.data);
        setTotal(result.total);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [baseUrl, page, limit, searchQuery]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  const search = useCallback((query: string) => {
    setSearchQuery(query);
    setPage(1);
  }, []);

  const reload = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const create = useCallback(
    async (body: Record<string, unknown>): Promise<T> => {
      const result = await api<T>(baseUrl, { method: "POST", body });
      await fetchData();
      return result;
    },
    [baseUrl, fetchData],
  );

  const update = useCallback(
    async (id: string, body: Record<string, unknown>): Promise<T> => {
      const result = await api<T>(`${baseUrl}/${id}`, {
        method: "PATCH",
        body,
      });
      await fetchData();
      return result;
    },
    [baseUrl, fetchData],
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      await api<undefined>(`${baseUrl}/${id}`, { method: "DELETE" });
      await fetchData();
    },
    [baseUrl, fetchData],
  );

  return {
    data,
    total,
    page,
    loading,
    error,
    search,
    setPage,
    reload,
    create,
    update,
    remove,
  };
}
