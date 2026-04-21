import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useApi } from '../../utils/useApi';
import { cancelBooking } from '../../utils/bookingApi';
import type { BookingListItem, Resource } from '../../types/admin';

export default function AdminBookings() {
  const [resourceFilter, setResourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: resources } = useApi<Resource[]>('/resources');

  const params = new URLSearchParams();
  if (resourceFilter !== 'all') params.set('resource_id', resourceFilter);
  if (statusFilter !== 'all') params.set('status', statusFilter);
  const path = `/bookings?${params.toString()}&_=${refreshKey}`;
  const { data: bookings, error } = useApi<BookingListItem[]>(path);

  async function handleCancel(id: string) {
    if (!confirm('Cancel this booking?')) return;
    try {
      await cancelBooking(id);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <section className="flex-1 p-8">
      <h1 className="text-2xl font-bold mb-6">Bookings</h1>

      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          value={resourceFilter}
          onChange={(e) => setResourceFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded text-sm"
        >
          <option value="all">All resources</option>
          {resources?.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded text-sm"
        >
          <option value="all">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {!bookings ? (
        <p>Loading…</p>
      ) : bookings.length === 0 ? (
        <p className="text-gray-500">No bookings match these filters.</p>
      ) : (
        <div className="border border-gray-200 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left">When</th>
                <th className="px-3 py-2 text-left">Resource</th>
                <th className="px-3 py-2 text-left">Customer</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div>{format(parseISO(b.start_time), 'EEE d MMM')}</div>
                    <div className="text-xs text-gray-500">
                      {format(parseISO(b.start_time), 'HH:mm')} – {format(parseISO(b.end_time), 'HH:mm')}
                    </div>
                  </td>
                  <td className="px-3 py-2">{b.resource_name}</td>
                  <td className="px-3 py-2">
                    <div>{b.customer_name}</div>
                    <div className="text-xs text-gray-500">{b.customer_email}</div>
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    {b.status !== 'cancelled' && b.status !== 'completed' && (
                      <button
                        onClick={() => handleCancel(b.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-gray-100 text-gray-600',
    completed: 'bg-blue-100 text-blue-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? ''}`}>
      {status}
    </span>
  );
}