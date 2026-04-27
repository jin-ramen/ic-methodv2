import { useState, useCallback } from 'react'

type PostResult<T> =
    | { ok: true; data: T }
    | { ok: false; status: number; detail: string }

type PostState<T> = {
    data: T | null;
    error: string | null;
    loading: boolean;
    submit: (body: unknown) => Promise<PostResult<T>>;
}

export function usePost<T>(path: string): PostState<T> {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const submit = useCallback(async (body: unknown): Promise<PostResult<T>> => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                const detail: string = payload.detail ?? `HTTP ${res.status}`;
                setError(detail);
                return { ok: false, status: res.status, detail };
            }
            const json: T = await res.json();
            setData(json);
            return { ok: true, data: json };
        } catch (e) {
            const detail = (e as Error).message;
            setError(detail);
            return { ok: false, status: 0, detail };
        } finally {
            setLoading(false);
        }
    }, [path]);

    return { data, error, loading, submit };
}