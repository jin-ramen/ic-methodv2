import { useState, useEffect } from 'react'

type FetchState<T> = {
    data: T | null;
    error: string | null;
}

export function useFetch<T>(path: string): FetchState<T> {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        const load = async () => {
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
            }
        };

        load();
        return () => controller.abort();
    }, [path]);

    return { data, error };
}