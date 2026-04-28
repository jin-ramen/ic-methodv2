import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { formatDate, formatTime } from '../utils/dateUtils';
import { toRoleLabel } from '../utils/roleUtils';
import { BASE } from '../utils/apiUtils';
import { NextSessionCard } from '../components/user_dashboard_cards/NextSessionCard'
import { PastSessionsCard } from '../components/user_dashboard_cards/PastSessionsCard'
import { UpcomingSessionsCard } from '../components/user_dashboard_cards/UpcomingSessionsCard'
import { UserCreditsCard } from '../components/user_dashboard_cards/UserCreditsCard'

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

    const initials = `${profile.first_name[0] ?? ''}${profile.last_name[0] ?? ''}`.toUpperCase();
    const roleLabel = toRoleLabel(profile.role);

    return (
        <>
            <div className="flex-1 overflow-y-auto px-5 py-8 animate-fade-in">
                <div className="max-w-4xl mx-auto flex flex-col gap-5">

                    {/* Profile */}
                    <Link
                        to="/account/profile"
                        className="rounded-xl px-6 pb-3 flex items-center gap-4 group"
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

                    {/* Next Session */}
                    {upcoming.length > 0 && <NextSessionCard booking={upcoming[0]} />}

                    {/* Desktop grid: Credits + History (left) · Upcoming (right) */}
                    <div className="grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-4 items-start">

                        {/* Left column */}
                        <div className="flex flex-col gap-4">

                            {/* Credits */}
                            <UserCreditsCard credits={6} />

                        </div>
                    </div>{/* end grid */}

                    {/* Upcoming */}
                    <UpcomingSessionsCard
                        bookings={bookings}
                        loading={bookingsLoading}
                        onCancelTarget={setCancelTarget}
                    />

                    {/* Announcements */}
                    <div className="rounded-2xl bg-wood-accent/10 border border-wood-text/5 px-5 py-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <p className="font-didot text-[10px] tracking-[0.3em] uppercase text-wood-accent">Announcements</p>
                            <Link
                                to="/booking"
                                className="font-didot text-[10px] tracking-[0.2em] uppercase text-wood-accent/70 hover:text-wood-dark transition-colors duration-500"
                            >
                                View More →
                            </Link>
                        </div>
                    </div>


                    {/* Past Sessions */}
                    {!bookingsLoading && <PastSessionsCard bookings={bookings} />}

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
