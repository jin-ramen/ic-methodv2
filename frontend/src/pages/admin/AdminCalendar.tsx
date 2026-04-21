import { useState, useMemo } from 'react';
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay, parseISO } from 'date-fns';
import { useApi } from '../../utils/useApi';
import type { BookingListItem, Resource } from '../../types/admin';

const HOUR_HEIGHT = 48;  // px per hour
const START_HOUR = 7;    // calendar shows 7am onward
const END_HOUR = 21;     // through 9pm
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

export default function AdminCalendar() {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [selectedResource, setSelectedResource] = useState<string>('all');

  const weekEnd = addDays(weekStart, 6);
  const fromStr = format(weekStart, 'yyyy-MM-dd');
  const toStr = format(weekEnd, 'yyyy-MM-dd');

  const { data: resources } = useApi<Resource[]>('/resources');
  const bookingsPath = `/bookings?from=${fromStr}&to=${toStr}${
    selectedResource !== 'all' ? `&resource_id=${selectedResource}` : ''
  }`;
  const { data: bookings, error } = useApi<BookingListItem[]>(bookingsPath);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Group bookings by day for easier rendering
  const bookingsByDay = useMemo(() => {
    const map = new Map<string, BookingListItem[]>();
    (bookings ?? []).forEach((b) => {
      if (b.status === 'cancelled') return;
      const key = format(parseISO(b.start_time), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    });
    return map;
  }, [bookings]);

  return (
    <section className="flex-1 p-8">
      {/* Controls */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart(subWeeks(weekStart, 1))}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
          >
            ←
          </button>
          <button
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
          >
            Today
          </button>
          <button
            onClick={() => setWeekStart(addWeeks(weekStart, 1))}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
          >
            →
          </button>
          <h2 className="ml-4 font-semibold">
            {format(weekStart, 'd MMM')} – {format(weekEnd, 'd MMM yyyy')}
          </h2>
        </div>

        <select
          value={selectedResource}
          onChange={(e) => setSelectedResource(e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded text-sm"
        >
          <option value="all">All resources</option>
          {resources?.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-red-600 mb-4">Couldn't load bookings: {error}</p>
      )}

      {/* Grid */}
      <div className="border border-gray-200 rounded overflow-hidden bg-white">
        {/* Header row with day labels */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200">
          <div className="bg-gray-50" />
          {days.map((d) => {
            const today = isSameDay(d, new Date());
            return (
              <div
                key={d.toISOString()}
                className={`p-2 text-center border-l border-gray-200 ${
                  today ? 'bg-blue-50' : 'bg-gray-50'
                }`}
              >
                <div className="text-xs text-gray-500">{format(d, 'EEE')}</div>
                <div className={`text-lg font-semibold ${today ? 'text-blue-700' : ''}`}>
                  {format(d, 'd')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {/* Hours column */}
          <div>
            {HOURS.map((h) => (
              <div
                key={h}
                className="text-xs text-gray-500 text-right pr-2 border-b border-gray-100"
                style={{ height: HOUR_HEIGHT }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d) => {
            const dayKey = format(d, 'yyyy-MM-dd');
            const dayBookings = bookingsByDay.get(dayKey) ?? [];
            return (
              <div
                key={d.toISOString()}
                className="relative border-l border-gray-200"
                style={{ height: HOUR_HEIGHT * HOURS.length }}
              >
                {/* Hour lines */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="border-b border-gray-100"
                    style={{ height: HOUR_HEIGHT }}
                  />
                ))}

                {/* Booking blocks */}
                {dayBookings.map((b) => {
                  const start = parseISO(b.start_time);
                  const end = parseISO(b.end_time);
                  const startMinutes = start.getHours() * 60 + start.getMinutes();
                  const endMinutes = end.getHours() * 60 + end.getMinutes();
                  const top = ((startMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                  const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;

                  // Skip bookings entirely outside the visible window
                  if (startMinutes >= END_HOUR * 60 || endMinutes <= START_HOUR * 60) {
                    return null;
                  }

                  return (
                    <div
                      key={b.id}
                      className="absolute left-1 right-1 bg-blue-100 border border-blue-300 rounded text-xs p-1 overflow-hidden cursor-pointer hover:bg-blue-200"
                      style={{ top, height: Math.max(height, 20) }}
                      title={`${b.customer_name} (${b.resource_name})`}
                    >
                      <div className="font-medium truncate">{b.customer_name}</div>
                      <div className="text-gray-600 truncate">
                        {format(start, 'HH:mm')} · {b.resource_name}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}