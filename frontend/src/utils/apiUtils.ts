export const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export function extractError(body: unknown): string {
    if (!body || typeof body !== 'object') return 'Something went wrong';
    const detail = (body as Record<string, unknown>).detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length > 0)
        return detail.map((e: Record<string, unknown>) => String(e.msg ?? e)).join(', ');
    return 'Something went wrong';
}