import type { Booking, BookingCreatePayload } from '../types/booking';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch { /* non-JSON */ }
    const err = new Error(detail) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export function createBooking(payload: BookingCreatePayload) {
  return request<Booking>('/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function cancelBooking(id: string) {
  return request<Booking>(`/bookings/${id}/cancel`, { method: 'POST' });
}