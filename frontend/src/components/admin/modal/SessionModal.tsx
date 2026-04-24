import { useEffect, useState } from 'react';

import type { SessionType } from '../../../types/SessionType';

import { formatTime, formatDate } from '../../../utils/dateUtils'

import EditSessionModal from './EditSessionModal';
import CancelSessionModal from './CancelSessionModal';
import CancelBookingModal from './CancelBookingModal';

type Booking = {
    id: string;
    flow_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    notes: string | null;
};

type Props = {
    session: SessionType;
    onClose: () => void;
    onUpdated: () => void;
    onDeleted: () => void;
};

export default function SessionModal({ session: session, onClose, onUpdated, onDeleted }: Props) {
    const [clients, setClients] = useState<Booking[]>([]);
    const [spotsRemaining, setSpotsRemaining] = useState(session.spots_remaining);

    const isPast = new Date(session.end_time) < new Date();
    const booked = session.capacity - spotsRemaining;
    const fillPct = session.capacity > 0 ? Math.round((booked / session.capacity) * 100) : 0;
    const [showEdit, setShowEdit] = useState(false);
    const [showCancel, setShowCancel] = useState(false);
    const [cancelBooking, setCancelBooking] = useState<Booking | null>(null);
    const [cancelError, setCancelError] = useState(false);

    useEffect(() => {
        fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/bookings?session_id=${session.id}`)
            .then(r => r.json())
            .then(j => setClients(j.results ?? []))
            .catch(() => {});
    }, [session.id]);

    return (
        <div className="fixed inset-x-5 inset-y-20 md:inset-auto md:relative md:block  flex flex-col md:h-full bg-wood-light rounded-xl shadow-md overflow-hidden animate-modal-in">

            {/* Title */}
            <div className="px-6 pt-6 pb-4">
                <div className="flex items-start justify-between pb-3">
                    <p className="font-cormorant text-2xl text-wood-dark leading-tight">{session.method_name ?? '—'}</p>
                    <button
                        onClick={onClose}
                        className="font-didot text-wood-accent/40 hover:text-wood-dark transition-colors duration-200 text-3xl leading-none shrink-0"
                    >×</button>
                </div>
                <div className="flex flex-col md:flex-row gap-2 md:gap-8 mt-2">
                    <div className="flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 shrink-0 text-wood-accent/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
                        </svg>
                        <p className="font-didot text-xs text-wood-accent/70">{formatTime(session.start_time)} – {formatTime(session.end_time)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 shrink-0 text-wood-accent/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                        </svg>
                        <p className="font-didot text-xs text-wood-accent/70">{formatDate(session.start_time)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 shrink-0 text-wood-accent/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                        </svg>
                        <p className="font-didot text-xs text-wood-accent/70">{session.instructor ?? '—'}</p>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-6 pb-4">
                <button
                    onClick={() => setShowEdit(true)}
                    disabled={isPast}
                    className="flex-1 font-didot text-xs tracking-wide bg-wood-accent text-white hover:bg-wood-dark py-2 rounded-lg transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-wood-accent"
                >
                    Edit Flow
                </button>
                <button
                    onClick={() => { if (clients.length > 0) { setCancelError(true); } else { setCancelError(false); setShowCancel(true); } }}
                    disabled={isPast}
                    className="flex-1 font-didot text-xs tracking-wide bg-red-400 text-white hover:bg-red-600 py-2 rounded-lg transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-400"
                >
                    Cancel Flow
                </button>
            </div>

            {cancelError && (
                <div className="mx-6 mb-2 font-didot text-xs text-red-400">
                    Remove all clients before cancelling this flow.
                </div>
            )}

            {showEdit && (
                <EditSessionModal
                    session={session}
                    onClose={() => setShowEdit(false)}
                    onUpdated={() => { setShowEdit(false); onUpdated(); }}
                />
            )}
            {showCancel && (
                <CancelSessionModal
                    session={session}
                    onClose={() => setShowCancel(false)}
                    onDeleted={() => { setShowCancel(false); onDeleted(); }}
                />
            )}
            {cancelBooking && (
                <CancelBookingModal
                    bookingId={cancelBooking.id}
                    clientName={`${cancelBooking.first_name} ${cancelBooking.last_name}`}
                    onClose={() => setCancelBooking(null)}
                    onDeleted={() => {
                        setClients(cs => cs.filter(c => c.id !== cancelBooking.id));
                        setSpotsRemaining(s => s + 1);
                        setCancelBooking(null);
                        onUpdated();
                    }}
                />
            )}

            {/* Capacity bar */}
            <div className="px-6 pb-4 flex flex-col gap-2">
                <div className="flex justify-between items-end">
                    <span className="font-didot text-xs text-wood-accent/60 tracking-wide">Capacity</span>
                    <span className="font-cormorant text-xl text-wood-dark">{booked} <span className="text-wood-accent/40 text-base">/ {session.capacity}</span></span>
                </div>
                <div className="w-full h-1.5 bg-wood-accent/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-wood-accent transition-all duration-500" style={{ width: `${fillPct}%` }} />
                </div>
                <div className="flex justify-between">
                    <span className="font-didot text-xs text-wood-accent/40">{spotsRemaining} remaining</span>
                    <span className="font-didot text-xs text-wood-accent/40">{fillPct}% full</span>
                </div>
            </div>

            <div className="mx-6 border-t border-wood-accent/10" />

            {/* Client list */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4 flex flex-col gap-2">
                {clients.length === 0 && (
                    <p className="font-didot text-xs text-wood-accent/40">No bookings yet.</p>
                )}
                {clients.map(c => (
                    <div key={c.id} className="flex flex-row items-center justify-center py-2.5 border-b border-wood-accent/10 last:border-0 group">
                        <div className="min-w-0 flex-1">
                            <p className="font-cormorant text-base text-wood-dark">{c.first_name} {c.last_name}</p>
                            <p className="font-didot text-xs text-wood-accent/50 truncate">{c.email}{c.phone ? ` · ${c.phone}` : ''}</p>
                        </div>
                        <button
                            onClick={() => setCancelBooking(c)}
                            disabled={isPast}
                            className="ml-3 shrink-0 bg-red-400 text-white hover:bg-red-600 rounded-xl p-2 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-400"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                            </svg>
                        </button>
                    </div>
                ))}
            </div>

            {/* Add client */}
            <div className="px-6 py-4 border-t border-wood-accent/10">
                <button
                    disabled={isPast}
                    className="w-full font-didot text-xs tracking-wide bg-wood-accent text-white hover:bg-wood-dark py-2.5 rounded-lg transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-wood-accent"
                >
                    + Add Client
                </button>
            </div>

        </div>
    );
}