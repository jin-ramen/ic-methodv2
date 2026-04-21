import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useApi } from '../../utils/useApi';
import type { Booking } from '../../types/booking';

export default function BookConfirmation() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { data: booking, error } = useApi<Booking>(
    bookingId ? `/bookings/${bookingId}` : null
  );

  if (error) {
    return (
      <section className="flex-1 flex items-center justify-center p-8">
        <p className="font-playfair text-wood-accent">{error}</p>
      </section>
    );
  }
  if (!booking) {
    return (
      <section className="flex-1 flex items-center justify-center p-8">
        <p className="font-playfair text-wood-accent italic">Loading…</p>
      </section>
    );
  }

  return (
    <section className="flex-1 flex flex-col items-center justify-center px-8 py-16">
      <div className="w-full max-w-md">
        <p className="font-playfair text-xs text-wood-accent tracking-widest uppercase mb-3">
          Confirmed
        </p>
        <h1 className="font-cormorant text-4xl md:text-5xl text-wood-text tracking-widest">
          You're booked.
        </h1>
        <div className="w-12 h-px bg-wood-accent mt-4 mb-12" />

        <dl className="space-y-6">
          {[
            { label: 'Name', value: booking.customer_name },
            { label: 'Email', value: booking.customer_email },
            {
              label: 'Date',
              value: format(new Date(booking.start_time), 'EEEE, d MMMM yyyy'),
            },
            {
              label: 'Time',
              value: `${format(new Date(booking.start_time), 'HH:mm')} – ${format(new Date(booking.end_time), 'HH:mm')}`,
            },
            {
              label: 'Reference',
              value: booking.id.slice(0, 8).toUpperCase(),
              mono: true,
            },
          ].map(({ label, value, mono }) => (
            <div key={label} className="border-b border-wood-accent/20 pb-4">
              <dt className="font-playfair text-[10px] text-wood-accent tracking-widest uppercase mb-1">
                {label}
              </dt>
              <dd
                className={`text-wood-text ${
                  mono ? 'font-mono text-sm tracking-widest' : 'font-playfair text-sm'
                }`}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <Link
          to="/book"
          className="inline-block mt-10 font-playfair text-xs text-wood-accent tracking-widest uppercase hover:text-wood-text transition-colors duration-200"
        >
          ← Book another
        </Link>
      </div>
    </section>
  );
}