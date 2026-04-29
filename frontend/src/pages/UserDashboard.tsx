import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { formatDate, formatTime } from '../utils/dateUtils';
import { toRoleLabel } from '../utils/roleUtils';
import { BASE } from '../utils/apiUtils';
import { NextSessionCard } from '../components/user_dashboard_cards/NextSessionCard'
import { PastSessionsCard } from '../components/user_dashboard_cards/PastSessionsCard'
import { UpcomingSessionsCard } from '../components/user_dashboard_cards/UpcomingSessionsCard'
import { UserCreditsCard } from '../components/user_dashboard_cards/UserCreditsCard'
import { RequiredActionCard } from '../components/user_dashboard_cards/RequiredActionCard'

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
    payment_status?: string | null;
    payment_amount?: string | null;
    payment_currency?: string | null;
    payment_expires_at?: string | null;
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

    const paid = booking.payment_status === 'succeeded';
    const paidAmount = paid && booking.payment_amount ? Number(booking.payment_amount) : null;
    const currency = booking.payment_currency ?? 'AUD';
    const retentionPct = isLate ? 0.2 : 0;
    const retainedAmount = paidAmount != null ? +(paidAmount * retentionPct).toFixed(2) : null;
    const refundAmount = paidAmount != null ? +(paidAmount - (retainedAmount ?? 0)).toFixed(2) : null;

    const fmtMoney = (n: number) => `${n.toFixed(2)} ${currency}`;

    const countdownText = (() => {
        if (!booking.session_start) return null;
        const ms = new Date(booking.session_start).getTime() - Date.now();
        if (ms <= 0) return 'Already started';
        const totalMins = Math.round(ms / 60_000);
        if (totalMins < 60) return `in ${totalMins} min`;
        const hours = Math.floor(totalMins / 60);
        const mins = totalMins % 60;
        if (hours < 24) return mins ? `in ${hours}h ${mins}m` : `in ${hours}h`;
        const days = Math.floor(hours / 24);
        const remH = hours % 24;
        return remH ? `in ${days}d ${remH}h` : `in ${days} day${days === 1 ? '' : 's'}`;
    })();

    const [submitting, setSubmitting] = useState(false);
    const [step, setStep] = useState<'review' | 'confirm-late'>('review');
    const [acknowledged, setAcknowledged] = useState(false);
    const [closing, setClosing] = useState(false);

    const requestClose = () => {
        if (submitting || closing) return;
        setClosing(true);
    };
    const handleAnimationEnd = () => { if (closing) onClose(); };

    const handleCancel = async () => {
        if (submitting) return;
        setSubmitting(true);
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

    const handlePrimary = () => {
        if (isLate && paid && step === 'review') {
            setStep('confirm-late');
            return;
        }
        handleCancel();
    };

    if (step === 'confirm-late') {
        return (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-5 pb-5 sm:pb-0">
                <div
                    className={`absolute inset-0 bg-black/40 backdrop-blur-sm ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
                    onClick={requestClose}
                />
                <div
                    className={`relative w-full max-w-sm bg-wood-accent/90 rounded-xl border border-red-400/30 px-6 py-6 flex flex-col gap-5 ${closing ? 'animate-modal-out' : 'animate-modal-in'}`}
                    onAnimationEnd={handleAnimationEnd}
                >
                    <button
                        onClick={requestClose}
                        aria-label="Close"
                        className="absolute top-3 right-3 font-didot text-wood-text/40 hover:text-wood-text text-2xl leading-none transition-colors"
                    >
                        ×
                    </button>
                    <div className="flex flex-col gap-1">
                        <p className="font-didot text-[10px] tracking-widest uppercase text-red-400">Confirm Late Cancellation</p>
                        <p className="font-cormorant text-2xl text-wood-text leading-tight">
                            Are you sure?
                        </p>
                    </div>

                    <div className="rounded-lg bg-red-500/10 border border-red-400/30 px-4 py-3 flex flex-col gap-2">
                        <p className="font-didot text-xs text-wood-text/80 leading-relaxed">
                            Because this session starts in less than {LATE_CANCEL_HOURS} hours, only a partial refund is available.
                        </p>
                        {paidAmount != null && refundAmount != null && retainedAmount != null && (
                            <div className="flex flex-col gap-1 pt-1">
                                <div className="flex items-baseline justify-between">
                                    <span className="font-didot text-[10px] tracking-widest uppercase text-wood-text/50">Late fee retained</span>
                                    <span className="font-didot text-xs text-red-300">{fmtMoney(retainedAmount)}</span>
                                </div>
                                <div className="flex items-baseline justify-between">
                                    <span className="font-didot text-[10px] tracking-widest uppercase text-wood-text/60">You'll receive</span>
                                    <span className="font-cormorant text-lg text-wood-text">{fmtMoney(refundAmount)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={acknowledged}
                            onChange={e => setAcknowledged(e.target.checked)}
                            className="mt-0.5 w-4 h-4 accent-red-500 cursor-pointer shrink-0"
                        />
                        <span className="font-didot text-xs text-wood-text/80 leading-relaxed">
                            I understand that I will only receive a partial refund
                            {refundAmount != null ? ` of ${fmtMoney(refundAmount)}` : ''}, and that a 20% late
                            cancellation fee
                            {retainedAmount != null ? ` (${fmtMoney(retainedAmount)})` : ''} will be retained.
                        </span>
                    </label>

                    <div className="flex gap-3">
                        <button
                            onClick={() => { setStep('review'); setAcknowledged(false); }}
                            disabled={submitting}
                            className="flex-1 font-didot text-xs tracking-widest uppercase border border-wood-text/20 text-wood-text/60 hover:text-wood-text hover:border-wood-text/40 py-2.5 rounded-lg transition-colors duration-200 disabled:opacity-50"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleCancel}
                            disabled={!acknowledged || submitting}
                            className="flex-1 font-didot text-xs tracking-widest uppercase bg-red-500/80 text-white hover:bg-red-600 py-2.5 rounded-lg transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Cancelling…' : 'Confirm Cancel'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-5 pb-5 sm:pb-0">
            <div
                className={`absolute inset-0 backdrop-blur-sm ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
                onClick={requestClose}
            />
            <div
                className={`relative w-full max-w-sm bg-wood-accent/90 rounded-xl border border-wood-text/20 px-6 py-6 flex flex-col gap-5 ${closing ? 'animate-modal-out' : 'animate-modal-in'}`}
                onAnimationEnd={handleAnimationEnd}
            >
                <button
                    onClick={requestClose}
                    aria-label="Close"
                    className="absolute top-3 right-3 font-didot text-wood-text/40 hover:text-wood-text text-2xl leading-none transition-colors"
                >
                    ×
                </button>

                <div className="flex flex-col gap-1">
                    <p className="font-didot text-[10px] tracking-widest uppercase text-wood-text/50">Cancel Booking</p>
                    <p className="font-cormorant text-2xl text-wood-text leading-tight">
                        {booking.session_method_name ?? 'Class'}
                    </p>
                </div>

                {/* Session details */}
                <div className="rounded-lg bg-wood-text/5 border border-wood-text/10 divide-y divide-wood-text/10">
                    {booking.session_start && (
                        <div className="px-4 py-2.5 flex items-baseline justify-between gap-3">
                            <span className="font-didot text-[10px] tracking-widest uppercase text-wood-text/50">When</span>
                            <span className="font-didot text-xs text-wood-text/80 text-right">
                                {formatDate(new Date(booking.session_start))} · {formatTime(new Date(booking.session_start))}
                            </span>
                        </div>
                    )}
                    {countdownText && (
                        <div className="px-4 py-2.5 flex items-baseline justify-between gap-3">
                            <span className="font-didot text-[10px] tracking-widest uppercase text-wood-text/50">Starts</span>
                            <span className={`font-didot text-xs text-right ${isLate ? 'text-red-300' : 'text-wood-text/80'}`}>
                                {countdownText}
                            </span>
                        </div>
                    )}
                    {booking.session_instructor && (
                        <div className="px-4 py-2.5 flex items-baseline justify-between gap-3">
                            <span className="font-didot text-[10px] tracking-widest uppercase text-wood-text/50">Instructor</span>
                            <span className="font-didot text-xs text-wood-text/80 text-right">{booking.session_instructor}</span>
                        </div>
                    )}
                </div>

                {/* Cancellation policy banner */}
                <div className={`rounded-lg px-4 py-3 ${isLate ? 'bg-red-500/15 border border-red-400/30' : 'bg-emerald-500/10 border border-emerald-400/25'}`}>
                    {isLate ? (
                        <>
                            <p className="font-didot text-[10px] tracking-widest uppercase text-red-400 mb-1">Late Cancellation</p>
                            <p className="font-didot text-xs text-wood-text/70 leading-relaxed">
                                This session starts in less than {LATE_CANCEL_HOURS} hours. A 20% fee will be retained from your payment.
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="font-didot text-[10px] tracking-widest uppercase text-emerald-300 mb-1">Early Cancellation</p>
                            <p className="font-didot text-xs text-wood-text/70 leading-relaxed">
                                You're cancelling more than {LATE_CANCEL_HOURS} hours ahead — you'll be refunded in full.
                            </p>
                        </>
                    )}
                </div>

                {/* Refund breakdown */}
                {paidAmount != null && refundAmount != null && (
                    <div className="rounded-lg bg-wood-dark/20 border border-wood-text/10 px-4 py-3 flex flex-col gap-2">
                        <p className="font-didot text-[10px] tracking-widest uppercase text-wood-text/50">Refund</p>
                        <div className="flex items-baseline justify-between">
                            <span className="font-didot text-xs text-wood-text/60">Original payment</span>
                            <span className="font-didot text-xs text-wood-text/80">{fmtMoney(paidAmount)}</span>
                        </div>
                        {isLate && retainedAmount != null && retainedAmount > 0 && (
                            <div className="flex items-baseline justify-between">
                                <span className="font-didot text-xs text-red-300/80">Late fee (20%)</span>
                                <span className="font-didot text-xs text-red-300">−{fmtMoney(retainedAmount)}</span>
                            </div>
                        )}
                        <div className="flex items-baseline justify-between pt-2 border-t border-wood-text/10">
                            <span className="font-didot text-[10px] tracking-widest uppercase text-wood-text/60">You'll receive</span>
                            <span className="font-cormorant text-lg text-wood-text">{fmtMoney(refundAmount)}</span>
                        </div>
                        <p className="font-didot text-[10px] text-wood-text/40 leading-relaxed mt-1">
                            Refunds are issued to your original payment method and can take 5–10 business days to appear.
                        </p>
                    </div>
                )}

                {!paid && (
                    <p className="font-didot text-[10px] text-wood-text/50 leading-relaxed">
                        No payment has been captured for this booking, so nothing will be refunded.
                    </p>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={requestClose}
                        disabled={submitting}
                        className="flex-1 font-didot text-xs tracking-widest uppercase border border-wood-text/20 text-wood-text/60 hover:text-wood-text hover:border-wood-text/40 py-2.5 rounded-lg transition-colors duration-200 disabled:opacity-50"
                    >
                        Keep
                    </button>
                    <button
                        onClick={handlePrimary}
                        disabled={submitting}
                        className="flex-1 font-didot text-xs tracking-widest uppercase bg-red-500/80 text-white hover:bg-red-600 py-2.5 rounded-lg transition-colors duration-200 disabled:opacity-50"
                    >
                        {submitting ? 'Cancelling…' : isLate && paid ? 'Continue' : 'Cancel Booking'}
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

    const pendingPayment = bookings
        .filter(b => b.status === 'pending_payment')
        .sort((a, b) => {
            const ax = a.payment_expires_at ? new Date(a.payment_expires_at).getTime() : Infinity;
            const bx = b.payment_expires_at ? new Date(b.payment_expires_at).getTime() : Infinity;
            return ax - bx;
        });

    const initials = `${profile.first_name[0] ?? ''}${profile.last_name[0] ?? ''}`.toUpperCase();
    const roleLabel = toRoleLabel(profile.role);

    return (
        <>
            <div className="flex-1 overflow-y-auto px-5 py-8 animate-fade-in bg-wood-light/95">
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

                    {/* Required Action — pending payments */}
                    <RequiredActionCard bookings={pendingPayment} />

                    {/* Next Session */}
                    {upcoming.length > 0 && <NextSessionCard booking={upcoming[0]} />}

                    {/* Desktop grid: Credits + History (left) · Upcoming (right) */}
                    <div className="grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-4 items-start">

                        {/* Left column */}
                        <div className="flex flex-col gap-4">

                            {/* Credits */}
                            <UserCreditsCard credits={6} />

                        </div>

                        {/* Upcoming */}
                        <UpcomingSessionsCard
                            bookings={bookings}
                            loading={bookingsLoading}
                            onCancelTarget={setCancelTarget}
                        />
                    </div>{/* end grid */}

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
