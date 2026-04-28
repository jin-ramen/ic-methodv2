import { Link } from 'react-router-dom';
import { formatTime, toDateKey, getTodayDate, formatDate } from '../../utils/dateUtils';

type UserBooking = {
    id: string;
    session_start: string | null;
    session_end: string | null;
    session_instructor: string | null;
    session_method_name: string | null;
    status: string;
    cancelled_at: string | null;
    cancellation_type: string | null;
};

export function UpcomingSessionsCard({
    bookings,
    loading,
    onCancelTarget,
}: {
    bookings: UserBooking[];
    loading: boolean;
    onCancelTarget: (booking: UserBooking) => void;
}) {
    const now = new Date();
    const upcoming = bookings
        .filter(b => b.status === 'booked' && b.session_start && new Date(b.session_start) > now)
        .sort((a, b) => new Date(a.session_start!).getTime() - new Date(b.session_start!).getTime());

    const today = getTodayDate();
    const grouped = upcoming.reduce<{ key: string; label: string; bookings: UserBooking[] }[]>((acc, b) => {
        const date = new Date(b.session_start!);
        const key = toDateKey(date);
        const existing = acc.find(g => g.key === key);
        if (existing) { existing.bookings.push(b); return acc; }
        const diff = Math.round((new Date(key).getTime() - today.getTime()) / 86_400_000);
        const label = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : formatDate(date);
        acc.push({ key, label, bookings: [b] });
        return acc;
    }, []);

    return (
        <div className="rounded-xl px-6 py-5 flex flex-col gap-4 bg-wood-accent/10 shadow-sm">
            <div className="flex items-center justify-between">
                <p className="font-didot text-[10px] tracking-[0.3em] uppercase text-wood-accent">Upcoming</p>
                <Link
                    to="/booking"
                    className="font-didot text-[10px] tracking-[0.2em] uppercase text-wood-accent/70 hover:text-wood-dark transition-colors duration-500"
                >
                    Book Now →
                </Link>
            </div>

            {loading ? (
                <p className="font-didot text-xs text-wood-accent/40 tracking-widest py-2">Loading…</p>
            ) : upcoming.length === 0 ? (
                <div className="flex flex-col items-center gap-8 py-6">
                    <p className="font-didot text-xs text-wood-accent/40 tracking-widest">No upcoming classes</p>
                    <Link
                        to="/booking"
                        className="font-didot text-xs tracking-widest uppercase border border-wood-accent/40 bg-wood-accent/90 text-wood-text shadow-sm hover:bg-wood-accent/70 hover:shadow-md py-2.5 px-5 rounded-lg transition-all duration-200"
                    >
                        Browse Classes
                    </Link>
                </div>
            ) : (
                <>
                    <div className="flex flex-col gap-5">
                        {grouped.map(group => (
                            <div key={group.key} className="flex flex-col gap-2">
                                <p className="font-didot text-[10px] tracking-widest uppercase text-wood-accent/40">
                                    {group.label}
                                </p>
                                {group.bookings.map(b => (
                                    <div
                                        key={b.id}
                                        className="bg-wood-accent/80 border border-wood-text/5 rounded-2xl px-5 py-5 flex flex-col gap-1
                                                   transition-all duration-500 hover:bg-wood-accent/70 hover:border-wood-text/10 group"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <p className="font-cormorant text-2xl text-wood-text/90 leading-tight">
                                                {b.session_method_name ?? 'Class'}
                                            </p>
                                            <button
                                                onClick={() => onCancelTarget(b)}
                                                className="font-didot text-[9px] tracking-[0.2em] uppercase text-wood-text/40
                                                           group-hover:text-red-400/70 transition-all duration-500 pt-1.5"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                        <p className="font-didot text-sm text-wood-text/60 mt-1">
                                            {formatTime(new Date(b.session_start!))}
                                            {b.session_end ? ` – ${formatTime(new Date(b.session_end))}` : ''}
                                        </p>
                                        {b.session_instructor && (
                                            <p className="font-didot text-[10px] tracking-[0.25em] uppercase text-wood-text/50 mt-0.5">
                                                {b.session_instructor}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                    <Link
                        to="/booking"
                        className="self-start font-didot text-xs tracking-widest uppercase border border-wood-accent/40 text-wood-accent hover:bg-wood-accent hover:text-wood-text py-2.5 px-5 rounded-lg transition-all duration-200"
                    >
                        Book Another Class
                    </Link>
                </>
            )}
        </div>
    );
}