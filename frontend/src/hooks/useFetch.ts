import { useState, useEffect, useCallback } from 'react'

type FetchState<T> = {
    data: T | null;
    error: string | null;
    loading: boolean;
    refetch: () => void;
}

export function useFetch<T>(path: string): FetchState<T> {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [tick, setTick] = useState(0);

    const refetch = useCallback(() => setTick(t => t + 1), []);

    useEffect(() => {
        const controller = new AbortController();

        const load = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}${path}`, {
                    signal: controller.signal,
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                setData(json.results);
            } catch (e) {
                if ((e as Error).name !== 'AbortError') {
                    setError((e as Error).message);
                }
            } finally {
                setLoading(false);
            }
        };

        load();
        return () => controller.abort();
    }, [path, tick]);

    return { data, error, loading, refetch };
}