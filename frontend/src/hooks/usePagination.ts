"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface UsePaginationOptions {
  pageSize?: number;
  /** Additional query params (e.g. { statut: "soumis" }) */
  filters?: Record<string, string | undefined>;
}

const fetcher = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : null));

export function usePagination<T = unknown>(basePath: string, options: UsePaginationOptions = {}) {
  const { pageSize = 25, filters = {} } = options;
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== "") params.set(k, v);
  });

  const url = `${basePath}?${params.toString()}`;
  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<T>>(url, fetcher, {
    keepPreviousData: true,
  });

  const goToPage = useCallback((p: number) => {
    setPage(Math.max(1, p));
  }, []);

  const nextPage = useCallback(() => {
    if (data && page < data.total_pages) setPage((p) => p + 1);
  }, [data, page]);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? page,
    pageSize: data?.page_size ?? pageSize,
    totalPages: data?.total_pages ?? 1,
    isLoading,
    error,
    goToPage,
    nextPage,
    prevPage,
    refresh: mutate,
  };
}
