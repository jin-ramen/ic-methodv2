import { useState } from 'react';
import CancelBookingModal from './CancelBookingModal';
import { getRoleStyle, toRoleLabel } from '../../../utils/roleUtils';

export type BookingType = {
    id: string;
    session_id: string;
    user_id: string | null;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    notes: string | null;
    is_guest: boolean;
    role: string | null;
    status: string;
    cancellation_type: string | null;
};


type Props = {
    booking: BookingType;
    isPast: boolean;
    onClose: () => void;
    onDeleted: () => void;
};

export default function BookingDetailModal({ booking, isPast, onClose, onDeleted }: Props) {
    const [showCancel, setShowCancel] = useState(false);
    const [closing, setClosing] = useState(false);

    const fullName = `${booking.first_name} ${booking.last_name}`;
    const handleClose = () => setClosing(true);
    const handleAnimationEnd = () => { if (closing) onClose(); };

    const badge = booking.is_guest
        ? <span className="font-didot text-[9px] tracking-widest uppercase px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">Guest</span>
        : booking.role
            ? <span className={`font-didot text-[9px] tracking-widest uppercase px-2 py-0.5 rounded-full ${getRoleStyle(booking.role)}`}>
                {toRoleLabel(booking.role)}
              </span>
            : null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div
                    className={`absolute inset-0 bg-black/40 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
                    onClick={handleClose}
                />
                <div
                    className={`relative bg-wood-light w-full max-w-sm mx-4 rounded-xl shadow-xl overflow-hidden opacity-0 ${closing ? 'animate-modal-out' : 'animate-modal-in'}`}
                    onAnimationEnd={handleAnimationEnd}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-wood-accent/10">
                        <div>
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                <p className="font-cormorant text-2xl text-wood-dark leading-tight">{fullName}</p>
                                {badge}
                            </div>
                        </div>
                        <button onClick={handleClose} className="font-didot text-wood-accent/40 hover:text-wood-dark text-3xl leading-none ml-2 shrink-0 transition-colors">×</button>
                    </div>

                    {/* Details */}
                    <div className="px-6 py-4 flex flex-col gap-3">
                        {booking.email && (
                            <div className="flex items-center gap-2">
                                <svg className="w-3.5 h-3.5 text-wood-accent/40 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                                </svg>
                                <p className="font-didot text-xs text-wood-accent/70">{booking.email}</p>
                            </div>
                        )}
                        {booking.phone && (
                            <div className="flex items-center gap-2">
                                <svg className="w-3.5 h-3.5 text-wood-accent/40 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.07 3.4a2 2 0 0 1 1.99-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                                </svg>
                                <p className="font-didot text-xs text-wood-accent/70">{booking.phone}</p>
                            </div>
                        )}

                        {booking.notes ? (
                            <div className="mt-1 bg-wood-dark/5 rounded-lg px-4 py-3">
                                <p className="font-didot text-[10px] tracking-widest uppercase text-wood-accent/40 mb-1">Notes</p>
                                <p className="font-didot text-xs text-wood-dark/70 leading-relaxed">{booking.notes}</p>
                            </div>
                        ) : (
                            <p className="font-didot text-xs text-wood-accent/30 italic">No notes.</p>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 pb-6">
                        <button
                            onClick={() => setShowCancel(true)}
                            disabled={isPast}
                            className="w-full font-didot text-xs tracking-wide bg-red-400 text-white hover:bg-red-600 py-2.5 rounded-lg transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Remove booking
                        </button>
                    </div>
                </div>
            </div>

            {showCancel && (
                <CancelBookingModal
                    bookingId={booking.id}
                    clientName={fullName}
                    onClose={() => setShowCancel(false)}
                    onDeleted={() => { setShowCancel(false); onDeleted(); }}
                />
            )}
        </>
    );
}
