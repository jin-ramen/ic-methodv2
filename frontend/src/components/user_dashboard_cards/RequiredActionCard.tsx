import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDate, formatTime } from '../../utils/dateUtils';

type PendingBooking = {
    id: string;
    session_start: string | null;
    session_end?: string | null;
    session_instructor?: string | null;
    session_method_name: string | null;
    payment_amount?: string | null;
    payment_currency?: string | null;
    payment_expires_at?: string | null;
};

function Countdown({ expiresAt }: { expiresAt: string }) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, []);
    const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
    if (remaining === 0) {
        return <span className="font-didot text-[10px] tracking-widest uppercase text-red-300">expired</span>;
    }
    const mm = Math.floor(remaining / 60).toString().padStart(2, '0');
    const ss = (remaining % 60).toString().padStart(2, '0');
    return (
        <span className={`font-cormorant text-2xl tabular-nums ${remaining <= 60 ? 'text-red-300' : 'text-wood-text'}`}>
            {mm}:{ss}
        </span>
    );
}

export function RequiredActionCard({ bookings }: { bookings: PendingBooking[] }) {
    if (bookings.length === 0) return null;

    return (
        <div className="rounded-2xl border border-amber-300/30 bg-amber-100/40 px-6 py-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <span className="block w-1 h-1 rounded-full bg-amber-600" />
                <p className="font-didot text-[10px] tracking-[0.35em] uppercase text-amber-700">
                    Required Action
                </p>
            </div>

            <div className="flex flex-col gap-3">
                {bookings.map(b => (
                    <Link
                        key={b.id}
                        to={`/checkout/${b.id}`}
                        state={{
                            session: {
                                id: '',
                                method_id: null,
                                method_name: b.session_method_name,
                                start_time: b.session_start,
                                end_time: b.session_end ?? null,
                                capacity: 0,
                                spots_remaining: 0,
                                instructor: b.session_instructor ?? null,
                                created_at: '',
                            },
                        }}
                        className="flex items-center gap-4 rounded-xl bg-wood-accent/95 hover:bg-wood-accent transition-colors duration-200 px-5 py-4 group"
                    >
                        <div className="flex-1 min-w-0">
                            <p className="font-didot text-[10px] tracking-widest uppercase text-wood-text/50 mb-1">
                                Awaiting Payment
                            </p>
                            <p className="font-cormorant text-xl text-wood-text leading-tight truncate">
                                {b.session_method_name ?? 'Class'}
                            </p>
                            {b.session_start && (
                                <p className="font-didot text-xs text-wood-text/60 mt-0.5">
                                    {formatDate(new Date(b.session_start))} · {formatTime(new Date(b.session_start))}
                                </p>
                            )}
                            {b.payment_amount && (
                                <p className="font-didot text-xs text-wood-text/70 tracking-wide mt-2">
                                    {b.payment_amount} {b.payment_currency ?? ''}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                            {b.payment_expires_at && (
                                <>
                                    <p className="font-didot text-[9px] tracking-widest uppercase text-wood-text/40">
                                        holding
                                    </p>
                                    <Countdown expiresAt={b.payment_expires_at} />
                                </>
                            )}
                            <span className="font-didot text-[10px] tracking-widest uppercase text-wood-text/60 mt-1 group-hover:text-wood-text transition-colors duration-200">
                                Pay Now →
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
