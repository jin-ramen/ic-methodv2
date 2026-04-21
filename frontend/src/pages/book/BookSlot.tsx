import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, addDays, startOfDay } from 'date-fns';
import { useApi } from '../../utils/useApi';
import { createBooking } from '../../utils/bookingApi';
import type { Resource } from '../../types/resource';
import type { AvailabilityResponse, AvailabilitySlot } from '../../types/availability';

export default function BookSlot() {
  const { resourceId } = useParams<{ resourceId: string }>();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const { data: resource, error: resourceError } = useApi<Resource>(
    resourceId ? `/resources/${resourceId}` : null
  );
  const { data: availability } = useApi<AvailabilityResponse>(
    resourceId
      ? `/resources/${resourceId}/availability?from=${dateStr}&to=${dateStr}`
      : null
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedSlot || !resourceId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const booking = await createBooking({
        resource_id: resourceId,
        customer_name: name,
        customer_email: email,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        idempotency_key: idempotencyKey,
      });
      navigate(`/book/confirmation/${booking.id}`);
    } catch (err) {
      const e = err as Error & { status?: number };
      setSubmitError(
        e.status === 409
          ? 'Sorry — that slot was just taken. Please pick another.'
          : e.message
      );
      setSubmitting(false);
    }
  }

  if (resourceError) {
    return (
      <section className="flex-1 flex items-center justify-center p-8">
        <p className="font-playfair text-wood-accent">{resourceError}</p>
      </section>
    );
  }
  if (!resource) {
    return (
      <section className="flex-1 flex items-center justify-center p-8">
        <p className="font-playfair text-wood-accent italic">Loading…</p>
      </section>
    );
  }

  const dateOptions = Array.from({ length: 14 }, (_, i) =>
    startOfDay(addDays(new Date(), i))
  );

  return (
    <section className="flex-1 flex flex-col items-center px-8 py-16">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <h1 className="font-cormorant text-4xl md:text-5xl text-wood-text tracking-widest">
          {resource.name}
        </h1>
        <p className="font-playfair text-xs text-wood-accent mt-1 tracking-widest uppercase">
          {resource.duration_minutes} minute session
        </p>
        <div className="w-12 h-px bg-wood-accent mt-4 mb-12" />

        {/* Date strip */}
        <div className="mb-10">
          <p className="font-playfair text-xs text-wood-accent tracking-widest uppercase mb-4">
            Select a date
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {dateOptions.map((d) => {
              const selected = d.getTime() === selectedDate.getTime();
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => {
                    setSelectedDate(d);
                    setSelectedSlot(null);
                  }}
                  className={`flex-shrink-0 min-w-[64px] px-3 py-4 text-center transition-all duration-200 border ${
                    selected
                      ? 'bg-wood-primary border-wood-accent text-wood-text'
                      : 'border-wood-accent/30 text-wood-accent hover:border-wood-accent hover:text-wood-text'
                  }`}
                >
                  <div className="font-playfair text-[10px] tracking-widest uppercase">
                    {format(d, 'EEE')}
                  </div>
                  <div className="font-cormorant text-2xl leading-tight">
                    {format(d, 'd')}
                  </div>
                  <div className="font-playfair text-[10px] tracking-widest uppercase">
                    {format(d, 'MMM')}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Slot grid */}
        <div className="mb-10">
          <p className="font-playfair text-xs text-wood-accent tracking-widest uppercase mb-4">
            Select a time
          </p>
          {!availability ? (
            <p className="font-playfair text-sm text-wood-accent italic">Loading…</p>
          ) : availability.slots.length === 0 ? (
            <p className="font-playfair text-sm text-wood-accent italic">
              No times available this day.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {availability.slots.map((slot) => {
                const selected = selectedSlot?.start_time === slot.start_time;
                return (
                  <button
                    key={slot.start_time}
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-3 text-sm transition-all duration-200 border font-playfair tracking-wide ${
                      selected
                        ? 'bg-wood-primary border-wood-accent text-wood-text'
                        : 'border-wood-accent/30 text-wood-accent hover:border-wood-accent hover:text-wood-text'
                    }`}
                  >
                    {format(new Date(slot.start_time), 'HH:mm')}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Details form */}
        {selectedSlot && (
          <form onSubmit={handleSubmit} className="space-y-5 border-t border-wood-accent/30 pt-10">
            <p className="font-playfair text-xs text-wood-accent tracking-widest uppercase mb-6">
              Your details
            </p>

            <div>
              <label className="block font-playfair text-xs text-wood-accent tracking-widest uppercase mb-2">
                Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-transparent border border-wood-accent/30 text-wood-text font-playfair text-sm focus:outline-none focus:border-wood-accent transition-colors placeholder:text-wood-accent/40"
              />
            </div>

            <div>
              <label className="block font-playfair text-xs text-wood-accent tracking-widest uppercase mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-transparent border border-wood-accent/30 text-wood-text font-playfair text-sm focus:outline-none focus:border-wood-accent transition-colors placeholder:text-wood-accent/40"
              />
            </div>

            {submitError && (
              <p className="font-playfair text-sm text-red-400 italic">{submitError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 mt-4 border border-wood-accent text-wood-text font-playfair text-sm tracking-widest uppercase hover:bg-wood-primary transition-colors duration-300 disabled:opacity-40"
            >
              {submitting
                ? 'Booking…'
                : `Confirm — ${format(new Date(selectedSlot.start_time), 'HH:mm')} · ${format(selectedDate, 'EEE d MMM')}`}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}