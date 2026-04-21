import type {
  Resource,
  AvailabilityRule,
} from '../types/admin';

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
    } catch { /* */ }
    const err = new Error(detail) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

// Resources
export const createResource = (payload: {
  name: string;
  capacity?: number;
  duration_minutes?: number;
  buffer_minutes?: number;
}) => request<Resource>('/resources', {
  method: 'POST',
  body: JSON.stringify(payload),
});

export const updateResource = (id: string, payload: Partial<Resource>) =>
  request<Resource>(`/resources/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const deactivateResource = (id: string) =>
  request<Resource>(`/resources/${id}`, { method: 'DELETE' });

// Availability rules
export const createRule = (resourceId: string, payload: {
  day_of_week: number;
  start_time: string;
  end_time: string;
}) => request<AvailabilityRule>(`/resources/${resourceId}/availability-rules`, {
  method: 'POST',
  body: JSON.stringify(payload),
});

export const deleteRule = (ruleId: string) =>
  request<void>(`/availability-rules/${ruleId}`, { method: 'DELETE' });

// Admin booking
export const adminCreateBooking = (payload: {
  resource_id: string;
  customer_email: string;
  customer_name: string;
  start_time: string;
  end_time: string;
  allow_override?: boolean;
}) => request(`/admin/bookings`, {
  method: 'POST',
  body: JSON.stringify(payload),
});