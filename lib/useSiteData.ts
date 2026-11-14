"use client";
import { useEffect, useMemo, useState } from "react";
import { loadEphemeris, loadHorizon, loadSites, loadSummaries } from "./data";
import { visibility } from "./events";

const cache = new Map<string, Promise<unknown>>();
function cached<T>(key: string, f: () => Promise<T>): Promise<T> {
  if (!cache.has(key))
    cache.set(
      key,
      f().catch((e) => {
        cache.delete(key);
        throw e;
      }),
    );
  return cache.get(key) as Promise<T>;
}

export function useAsync<T>(key: string | null, f: () => Promise<T>) {
  const [s, setS] = useState<{ key: string | null; data?: T; error?: string }>({ key: null });
  useEffect(() => {
    if (!key) return;
    let alive = true;
    cached(key, f).then(
      (data) => alive && setS({ key, data }),
      (e) => alive && setS({ key, error: String(e) }),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const ready = key !== null && s.key === key;
  return { data: ready ? s.data : undefined, error: ready ? s.error : undefined, loading: key !== null && !ready };
}

export const useSites = () => useAsync("sites", loadSites);
export const useSummaries = () => useAsync("summaries", loadSummaries);

export function useSiteData(id: string | null) {
  const e = useAsync(id ? `eph:${id}` : null, () => loadEphemeris(id as string));
  const h = useAsync(id ? `hz:${id}` : null, () => loadHorizon(id as string));
  const vis = useMemo(
    () =>
      e.data && h.data
        ? { sun: visibility(e.data, h.data, "sun"), earth: visibility(e.data, h.data, "earth") }
        : undefined,
    [e.data, h.data],
  );
  return { eph: e.data, hz: h.data, vis, loading: e.loading || h.loading, error: e.error || h.error };
}
