import { useState, useEffect } from 'react';

type FetchState<T> = {
  data: T | null;
  error: string | null;
};

export function useApi<T>(path: string | null): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!path) return;  // allow conditional fetching
    const controller = new AbortController();

    const load = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL ?? ''}${path}`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          let detail = `HTTP ${res.status}`;
          try {
            const body = await res.json();
            detail = body.detail ?? detail;
          } catch { /* non-JSON response */ }
          throw new Error(detail);
        }
        const json = await res.json();
        setData(json);  // raw response, not json.results
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setError((e as Error).message);
        }
      }
    };

    load();
    return () => controller.abort();
  }, [path]);

  return { data, error };
}