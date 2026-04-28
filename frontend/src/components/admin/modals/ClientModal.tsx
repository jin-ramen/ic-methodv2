import { useEffect, useState, useCallback } from 'react';
import { formatDate, formatTime } from '../../../utils/dateUtils';
import BookingDetailModal, { type BookingType } from './BookingDetailModal';
import Initials from '../Initials';
import { getRoleStyle, toRoleLabel } from '../../../utils/roleUtils';

import { BASE } from '../../../utils/apiUtils';

type UserType = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    role: string;
};

type ClientBookingType = BookingType & {
    session_start: string;
    session_end: string;
    created_at: string;
};

type Props = { user: UserType; onClose: () => void };

export default function ClientModal({ user, onClose }: Props) {
    const [bookings, setBookings] = useState<ClientBookingType[]>([]);
    const [loadingBookings, setLoadingBookings] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState<ClientBookingType | null>(null);
    const [closing, setClosing] = useState(false);

    const fullName = `${user.first_name} ${user.last_name}`;
    const roleLabel = toRoleLabel(user.role);
    const roleStyle = getRoleStyle(user.role);

    const fetchBookings = useCallback(() => {
        setLoadingBookings(true);
        fetch(`${BASE}/api/bookings?user_id=${user.id}`)
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(j => setBookings(j.results ?? []))
            .catch(() => {})
            .finally(() => setLoadingBookings(false));
    }, [user.id]);

    useEffect(() => { fetchBookings(); }, [fetchBookings]);

    const handleClose = () => setClosing(true);
    const handleAnimationEnd = () => { if (closing) onClose(); };

    const now = new Date();
    const upcoming = bookings.filter(b => b.status === 'booked' && new Date(b.session_start) > now);
    const past = [...bookings.filter(b => b.status === 'booked' && new Date(b.session_start) <= now)].reverse();
    const cancelled = [...bookings.filter(b => b.status === 'cancelled')].sort((a, b) => new Date(b.session_start).getTime() - new Date(a.session_start).getTime());

    const totalClassMinutes = past.reduce((sum, b) =>
        sum + (new Date(b.session_end).getTime() - new Date(b.session_start).getTime()) / 60_000
    , 0);

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div
                    className={`absolute inset-0 bg-black/40 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
                    onClick={handleClose}
                />
                <div
                    className={`relative bg-wood-light w-full max-w-lg mx-4 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[85dvh] opacity-0 ${closing ? 'animate-modal-out' : 'animate-modal-in'}`}
                    onAnimationEnd={handleAnimationEnd}
                >
                    {/* Header */}
                    <div className="px-6 pt-6 pb-4 border-b border-wood-accent/10 shrink-0">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <Initials name={fullName} size="xl" />
                                <div>
                                    <p className="font-cormorant text-2xl text-wood-dark leading-tight">{fullName}</p>
                                    <span className={`inline-block mt-1 font-didot text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full ${roleStyle}`}>
                                        {roleLabel}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                className="font-didot text-wood-accent/40 hover:text-wood-dark text-3xl leading-none transition-colors shrink-0 ml-2"
                            >×</button>
                        </div>

                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <svg className="w-3.5 h-3.5 text-wood-accent/50 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                                </svg>
                                <p className="font-didot text-xs text-wood-accent/70 tracking-wide">{user.email}</p>
                            </div>
                            {user.phone && (
                                <div className="flex items-center gap-2">
                                    <svg className="w-3.5 h-3.5 text-wood-accent/50 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.07 3.4a2 2 0 0 1 1.99-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                                    </svg>
                                    <p className="font-didot text-xs text-wood-accent/70 tracking-wide">{user.phone}</p>
                                </div>
                            )}
                        </div>

                        {!loadingBookings && (
                            <div className="mt-3 flex items-center gap-2">
                                <svg className="w-3.5 h-3.5 text-wood-accent/50 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                                </svg>
                                <p className="font-didot text-xs text-wood-accent/70 tracking-wide">
                                    {totalClassMinutes >= 60
                                        ? `${Math.floor(totalClassMinutes / 60)}h ${totalClassMinutes % 60 > 0 ? `${totalClassMinutes % 60}m` : ''}`.trim()
                                        : `${totalClassMinutes}m`} total class time
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Bookings */}
                    <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4">
                        {loadingBookings ? (
                            <p className="font-didot text-xs text-wood-accent/40 tracking-widest">Loading bookings…</p>
                        ) : upcoming.length === 0 && past.length === 0 && cancelled.length === 0 ? (
                            <p className="font-didot text-xs text-wood-accent/40 tracking-widest">No bookings yet.</p>
                        ) : (
                            <div className="flex flex-col gap-6">
                                {upcoming.length > 0 && (
                                    <div>
                                        <p className="font-didot text-[10px] tracking-widest uppercase text-wood-accent/40 mb-3">Upcoming</p>
                                        <div className="flex flex-col gap-2">
                                            {upcoming.map(b => (
                                                <BookingRow key={b.id} booking={b} onClick={() => setSelectedBooking(b)} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {cancelled.length > 0 && (
                                    <div>
                                        <p className="font-didot text-[10px] tracking-widest uppercase text-wood-accent/40 mb-3">Cancelled</p>
                                        <div className="flex flex-col gap-2">
                                            {cancelled.map(b => (
                                                <CancelledBookingRow key={b.id} booking={b} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {past.length > 0 && (
                                    <div>
                                        <p className="font-didot text-[10px] tracking-widest uppercase text-wood-accent/40 mb-3">Past</p>
                                        <div className="flex flex-col gap-2">
                                            {past.map(b => (
                                                <BookingRow key={b.id} booking={b} past onClick={() => setSelectedBooking(b)} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {selectedBooking && (
                <BookingDetailModal
                    booking={selectedBooking}
                    isPast={new Date(selectedBooking.session_start) < now}
                    onClose={() => setSelectedBooking(null)}
                    onDeleted={() => {
                        setSelectedBooking(null);
                        fetchBookings();
                    }}
                />
            )}
        </>
    );
}

function CancelledBookingRow({ booking, past }: { booking: ClientBookingType; past?: boolean }) {
    return (
        <div className={`flex items-center justify-between gap-2 border rounded-lg px-4 py-3 ${past ? 'border-wood-accent/10 opacity-50 hover:opacity-80' : 'border-wood-accent/10'}`}>
            <div className="min-w-0 opacity-50">
                <p className="font-cormorant text-base text-wood-accent/60 leading-tight line-through decoration-wood-accent/30">
                    {formatDate(booking.session_start as unknown as Date)}
                </p>
                <p className="font-didot text-xs text-wood-accent/40">
                    {formatTime(booking.session_start as unknown as Date)} – {formatTime(booking.session_end as unknown as Date)}
                </p>
            </div>
            {booking.cancellation_type && (
                <span className="font-didot text-[9px] tracking-widest uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-400 shrink-0">
                    {booking.cancellation_type}
                </span>
            )}
        </div>
    );
}

function BookingRow({ booking, past, onClick }: { booking: ClientBookingType; past?: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex flex-col gap-1 border rounded-lg px-4 py-3 text-left transition-all duration-150 group hover:border-wood-accent/30 hover:shadow-sm ${past ? 'border-wood-accent/10 opacity-50 hover:opacity-80' : 'border-wood-accent/10'}`}
        >
            <div className="flex items-center justify-between gap-2">
                <p className={`font-cormorant text-base leading-tight ${past ? 'text-wood-accent' : 'text-wood-dark'}`}>
                    {formatDate(booking.session_start as unknown as Date)}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                    <p className="font-didot text-xs text-wood-accent/60">
                        {formatTime(booking.session_start as unknown as Date)} – {formatTime(booking.session_end as unknown as Date)}
                    </p>
                    <svg className="w-3 h-3 text-wood-accent/20 group-hover:text-wood-accent/50 transition-colors duration-150" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 1l6 6-6 6" />
                    </svg>
                </div>
            </div>
            {booking.notes && (
                <p className="font-didot text-xs text-wood-accent/50 italic truncate">{booking.notes}</p>
            )}
        </button>
    );
}
