import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { formatDate, formatTime, toDateKey, getTodayDate } from '../utils/dateUtils';
import { toRoleLabel } from '../utils/roleUtils';
import { BASE } from '../utils/apiUtils';

const LATE_CANCEL_HOURS = 12;

type UserProfile = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    role: string;
};

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

function CancelModal({
    booking,
    onClose,
    onCancelled,
    onRestored,
    onSuccess,
}: {
    booking: UserBooking;
    onClose: () => void;
    onCancelled: (id: string) => void;
    onRestored: (booking: UserBooking) => void;
    onSuccess?: () => void;
}) {
    const token = localStorage.getItem('access_token') ?? '';

    const hoursUntil = booking.session_start
        ? (new Date(booking.session_start).getTime() - Date.now()) / 3_600_000
        : Infinity;
    const isLate = hoursUntil < LATE_CANCEL_HOURS;

    const handleCancel = async () => {
        onCancelled(booking.id);
        onClose();
        try {
            const res = await fetch(`${BASE}/api/bookings/${booking.id}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ cancellation_type: isLate ? 'late' : 'early' }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            onSuccess?.();
        } catch {
            // Restore by re-adding the booking — parent refetches to get accurate state
            onRestored(booking);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-5 pb-5 sm:pb-0">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-wood-accent/75 rounded-xl border border-wood-text/20 px-6 py-6 flex flex-col gap-5 animate-modal-in">

                <div className="flex flex-col gap-1">
                    <p className="font-cormorant text-2xl text-wood-text leading-tight">
                        {booking.session_method_name ?? 'Class'}
                    </p>
                    {booking.session_start && (
                        <p className="font-didot text-xs text-wood-text/60">
                            {formatDate(new Date(booking.session_start))}
                            {' · '}
                            {formatTime(new Date(booking.session_start))}
                        </p>
                    )}
                </div>

                <div className={`rounded-lg px-4 py-3 ${isLate ? 'bg-red-500/15 border border-red-400/30' : 'bg-wood-text/5 border border-wood-text/10'}`}>
                    {isLate ? (
                        <>
                            <p className="font-didot text-[10px] tracking-widest uppercase text-red-400 mb-1">Late Cancellation</p>
                            <p className="font-didot text-xs text-wood-text/70 leading-relaxed">
                                This session is less than {LATE_CANCEL_HOURS} hours away. Late cancellations may incur a fee.
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="font-didot text-[10px] tracking-widest uppercase text-wood-text/50 mb-1">Early Cancellation</p>
                            <p className="font-didot text-xs text-wood-text/70 leading-relaxed">
                                Your spot will be released and made available to others.
                            </p>
                        </>
                    )}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 font-didot text-xs tracking-widest uppercase border border-wood-text/20 text-wood-text/60 hover:text-wood-text hover:border-wood-text/40 py-2.5 rounded-lg transition-colors duration-200"
                    >
                        Keep
                    </button>
                    <button
                        onClick={handleCancel}
                        className="flex-1 font-didot text-xs tracking-widest uppercase bg-red-500/80 text-white hover:bg-red-600 py-2.5 rounded-lg transition-colors duration-200"
                    >
                        Cancel Booking
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function UserDashboard({ onSessionsChanged }: { onSessionsChanged?: () => void } = {}) {
    const navigate = useNavigate();
    const token = localStorage.getItem('access_token') ?? '';

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);

    const [bookings, setBookings] = useState<UserBooking[]>([]);
    const [bookingsLoading, setBookingsLoading] = useState(false);
    const [cancelTarget, setCancelTarget] = useState<UserBooking | null>(null);
    const [toast, setToast] = useState<{ message: string; leaving: boolean } | null>(null);

    const showToast = (message: string) => {
        setToast({ message, leaving: false });
        setTimeout(() => setToast(t => t ? { ...t, leaving: true } : null), 2700);
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        if (!token) { navigate('/login'); return; }
        fetch(`${BASE}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => {
                if (r.status === 401) { navigate('/login'); return Promise.reject(); }
                return r.ok ? r.json() : Promise.reject();
            })
            .then((u: UserProfile) => setProfile(u))
            .catch(() => {})
            .finally(() => setProfileLoading(false));
    }, [token]);

    useEffect(() => {
        if (!profile) return;
        setBookingsLoading(true);
        fetch(`${BASE}/api/bookings?user_id=${profile.id}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(j => setBookings(j.results ?? []))
            .catch(() => {})
            .finally(() => setBookingsLoading(false));
    }, [profile]);

    if (!token) return null;

    if (profileLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <p className="font-didot text-xs text-wood-text/40 tracking-widest">Loading…</p>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <p className="font-didot text-xs text-red-400 tracking-widest">Unable to load account.</p>
            </div>
        );
    }

    const now = new Date();
    const upcoming = bookings
        .filter(b => b.status === 'booked' && b.session_start && new Date(b.session_start) > now)
        .sort((a, b) => new Date(a.session_start!).getTime() - new Date(b.session_start!).getTime());

    const today = getTodayDate();
    const groupedUpcoming = upcoming.reduce<{ key: string; label: string; bookings: UserBooking[] }[]>((acc, b) => {
        const date = new Date(b.session_start!);
        const key = toDateKey(date);
        const existing = acc.find(g => g.key === key);
        if (existing) { existing.bookings.push(b); return acc; }
        const diff = Math.round((new Date(key).getTime() - today.getTime()) / 86_400_000);
        const label = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : formatDate(date);
        acc.push({ key, label, bookings: [b] });
        return acc;
    }, []);


    const initials = `${profile.first_name[0] ?? ''}${profile.last_name[0] ?? ''}`.toUpperCase();
    const roleLabel = toRoleLabel(profile.role);

    return (
        <>
            <div className="flex-1 overflow-y-auto px-5 py-5 animate-fade-in">
                <div className="max-w-lg mx-auto flex flex-col gap-4">

                    {/* Profile section */}
                    <Link
                        to="/account/profile"
                        className="rounded-xl px-6 pb-5 flex items-center gap-4 group"
                    >
                        <div className="w-14 h-14 rounded-full bg-wood-accent/20 flex items-center justify-center shrink-0">
                            <span className="font-cormorant text-2xl text-wood-dark">{initials}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="font-cormorant text-2xl text-wood-accent leading-tight truncate group-hover:text-wood-accent/70 transition-colors duration-200">
                                {profile.first_name} {profile.last_name}
                            </p>
                            <p className="font-didot text-[10px] tracking-widest uppercase text-wood-accent/50 mt-0.5">
                                {roleLabel}
                            </p>
                        </div>
                        <svg className="w-4 h-4 text-wood-accent/30 group-hover:text-wood-accent/60 shrink-0 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>

                    {/* Credits section */}
                    <div className="rounded-2xl bg-wood-accent/10 border border-wood-text/5 px-5 py-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <p className="font-didot text-[10px] tracking-[0.3em] uppercase text-wood-accent">Credits</p>
                        <Link
                        to="/booking"
                        className="font-didot text-[10px] tracking-[0.2em] uppercase text-wood-accent/70 hover:text-wood-dark transition-colors duration-500"
                        >
                        Stack Your Credits →
                        </Link>
                    </div>

                    {/* An elegant ring / count */}
                    <div className="flex items-center gap-6">
                        <div className="relative w-16 h-16">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor"
                                    className="text-wood-text/10" strokeWidth="1" />
                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor"
                                    className="text-wood-dark/40" strokeWidth="1.5"
                                    strokeDasharray="97.39" strokeDashoffset="60" strokeLinecap="round" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center font-cormorant text-xl text-wood-dark">
                            6
                        </span>
                        </div>
                        <p className="font-didot text-xs text-wood-accent/50 leading-relaxed">
                        Credits recharge monthly. Use them to book any class.
                        </p>
                    </div>
                    </div>

                    {/* Scheduling section */}
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

                        {bookingsLoading ? (
                            <p className="font-didot text-xs text-wood-accent/40 tracking-widest py-2">Loading…</p>
                        ) : upcoming.length === 0 ? (
                            <div className="flex flex-col items-center gap-8 py-6">
                                <p className="font-didot text-xs text-wood-accent/40 tracking-widest">No upcoming classes</p>
                                <Link
                                    to="/booking"
                                    className="font-didot text-xs tracking-widest uppercase border border-wood-accent/40 text-wood-accent hover:bg-wood-accent hover:text-wood-text py-2.5 px-5 rounded-lg transition-all duration-200"
                                >
                                    Browse Classes
                                </Link>
                            </div>
                        ) : (
                            <>
                                <div className="flex flex-col gap-5">
                                    {groupedUpcoming.map(group => (
                                        <div key={group.key} className="flex flex-col gap-2">
                                            <p className="font-didot text-[10px] tracking-widest uppercase text-wood-accent/40">{group.label}</p>
                                            {group.bookings.map(b => (
                                                <div
                                                    key={b.id}
                                                    className="bg-wood-accent/80 border border-wood-text/5 rounded-2xl px-5 py-5 flex flex-col gap-1
                                                            transition-all duration-500 hover:bg-wood-accent/20 hover:border-wood-text/10 group"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                    <p className="font-cormorant text-2xl text-wood-text/90 leading-tight">
                                                        {b.session_method_name ?? 'Class'}
                                                    </p>
                                                    <button
                                                        onClick={() => setCancelTarget(b)}
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

                    {/* Announcements */}
                    <div className="rounded-2xl bg-wood-accent/10 border border-wood-text/5 px-5 py-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <p className="font-didot text-[10px] tracking-[0.3em] uppercase text-wood-accent">Accounements</p>
                            <Link
                            to="/booking"
                            className="font-didot text-[10px] tracking-[0.2em] uppercase text-wood-accent/70 hover:text-wood-dark transition-colors duration-500"
                            >
                            View More →
                            </Link>
                        </div>
                    </div>

                </div>
            </div>

            {cancelTarget && (
                <CancelModal
                    booking={cancelTarget}
                    onClose={() => setCancelTarget(null)}
                    onCancelled={id => {
                        const cancelled = bookings.find(b => b.id === id);
                        setBookings(prev => prev.filter(b => b.id !== id));
                        showToast(`${cancelled?.session_method_name ?? 'Booking'} cancelled`);
                    }}
                    onRestored={b => setBookings(prev => [...prev, b])}
                    onSuccess={onSessionsChanged}
                />
            )}

            {toast && (
                <div
                    className={`fixed bottom-8 left-1/2 z-50 flex items-center gap-2.5 bg-wood-dark border border-wood-accent/20 text-wood-text px-5 py-3 rounded-xl shadow-xl ${toast.leaving ? 'animate-toast-out' : 'animate-toast-in'}`}
                >
                    <svg className="w-3.5 h-3.5 text-wood-text/60 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <p className="font-didot text-xs tracking-widest">{toast.message}</p>
                </div>
            )}
        </>
    );
}
