import { useEffect, useState } from 'react';

import type { SessionType } from '../../../types/session';
import { formatTime, formatDate } from '../../../utils/dateUtils';
import { HoldCountdown, BOOKING_STATUS_STYLES, BOOKING_STATUS_LABELS } from '../HoldCountdown';

import { BASE } from '../../../utils/apiUtils';
import EditSessionModal from './EditSessionModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import BookingDetailModal, { type BookingType } from './BookingDetailModal';
import AddClientModal from './AddClientModal';


type Props = {
    session: SessionType;
    onClose: () => void;
    onUpdated: () => void;
    onDeleted: () => void;
};

export default function SessionModal({ session, onClose, onUpdated, onDeleted }: Props) {
    const [clients, setClients] = useState<BookingType[]>([]);
    const [clientsLoading, setClientsLoading] = useState(true);
    const [spotsRemaining, setSpotsRemaining] = useState(session.spots_remaining);

    const isPast = new Date(session.end_time) < new Date();
    const booked = session.capacity - spotsRemaining;
    const fillPct = session.capacity > 0 ? Math.round((booked / session.capacity) * 100) : 0;

    const [showEdit, setShowEdit] = useState(false);
    const [showCancel, setShowCancel] = useState(false);
    const [cancelError, setCancelError] = useState(false);
    const [scopeChooser, setScopeChooser] = useState(false);
    const [deleteScope, setDeleteScope] = useState<'this' | 'following'>('this');
    const [detailBooking, setDetailBooking] = useState<BookingType | null>(null);
    const [showAddClient, setShowAddClient] = useState(false);

    const isInactive = (s: string) => s === 'cancelled' || s === 'payment_failed';

    const fetchClients = () => {
        setClientsLoading(true);
        fetch(`${BASE}/api/bookings?session_id=${session.id}`)
            .then(r => r.json())
            .then(j => {
                const results: BookingType[] = j.results ?? [];
                results.sort((a, b) => (isInactive(a.status) ? 1 : 0) - (isInactive(b.status) ? 1 : 0));
                setClients(results);
            })
            .catch(() => {})
            .finally(() => setClientsLoading(false));
    };

    useEffect(() => { fetchClients(); }, [session.id]);

    return (
        <div className="fixed inset-x-5 inset-y-20 md:inset-auto md:relative md:block flex flex-col md:h-full bg-wood-light rounded-xl shadow-md overflow-hidden animate-modal-in">

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
                    Edit Session
                </button>
                <button
                    onClick={() => {
                        if (clients.some(c => c.status === 'booked' || c.status === 'pending_payment')) {
                            setCancelError(true);
                            return;
                        }
                        setCancelError(false);
                        if (session.rule_id) {
                            setScopeChooser(true);
                        } else {
                            setDeleteScope('this');
                            setShowCancel(true);
                        }
                    }}
                    disabled={isPast}
                    className="flex-1 font-didot text-xs tracking-wide bg-red-400 text-white hover:bg-red-600 py-2 rounded-lg transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-400"
                >
                    Cancel Session
                </button>
            </div>

            {cancelError && (
                <div className="mx-6 mb-2 font-didot text-xs text-red-400">
                    Remove all clients before cancelling this Session.
                </div>
            )}

            {showEdit && (
                <EditSessionModal
                    session={session}
                    onClose={() => setShowEdit(false)}
                    onUpdated={() => { setShowEdit(false); onUpdated(); }}
                />
            )}
            {scopeChooser && (
                <ScopeChooser
                    onClose={() => setScopeChooser(false)}
                    onPick={scope => {
                        setDeleteScope(scope);
                        setScopeChooser(false);
                        setShowCancel(true);
                    }}
                />
            )}
            {showCancel && (
                <ConfirmDeleteModal
                    title={deleteScope === 'following' ? 'Cancel This and Following' : 'Cancel Flow'}
                    description={
                        deleteScope === 'following' ? (
                            <>This will permanently cancel this session <span className="text-wood-text/80 italic">and every later session in the series</span>. Type <span className="text-wood-text/80 italic">{session.method_name ?? 'this session'}</span> to confirm.</>
                        ) : (
                            <>This will permanently cancel the session and remove all bookings. Type <span className="text-wood-text/80 italic">{session.method_name ?? 'this session'}</span> to confirm.</>
                        )
                    }
                    confirmText={session.method_name ?? 'this session'}
                    endpoint={`/api/sessions/${session.id}?scope=${deleteScope}`}
                    deleteLabel={deleteScope === 'following' ? 'Cancel This + Following' : 'Cancel Flow'}
                    deletingLabel="Cancelling…"
                    onClose={() => setShowCancel(false)}
                    onDeleted={() => { setShowCancel(false); onDeleted(); }}
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
                {clientsLoading ? (
                    <div className="flex flex-col gap-2">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-10 rounded-lg bg-wood-accent/10 animate-pulse" />
                        ))}
                    </div>
                ) : clients.length === 0 ? (
                    <p className="font-didot text-xs text-wood-accent/40">No bookings yet.</p>
                ) : clients.map(c => {
                    const inactive = isInactive(c.status);
                    const statusStyle = BOOKING_STATUS_STYLES[c.status] ?? BOOKING_STATUS_STYLES.booked;
                    const statusLabel = BOOKING_STATUS_LABELS[c.status] ?? c.status;
                    return (
                        <button
                            key={c.id}
                            onClick={() => setDetailBooking(c)}
                            className={`flex flex-row items-center py-2.5 border-b border-wood-accent/10 last:border-0 group w-full text-left -mx-2 px-2 rounded-lg transition-colors duration-150 ${inactive ? 'opacity-40' : 'hover:bg-wood-accent/5'}`}
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className={`font-cormorant text-base ${inactive ? 'text-wood-accent/60 line-through' : 'text-wood-dark'}`}>
                                        {c.first_name} {c.last_name}
                                    </p>
                                    {c.is_guest && !inactive && (
                                        <span className="font-didot text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-400">Guest</span>
                                    )}
                                    <span className={`font-didot text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded-full ${statusStyle}`}>
                                        {statusLabel}
                                    </span>
                                    {c.status === 'pending_payment' && c.payment_expires_at && (
                                        <HoldCountdown expiresAt={c.payment_expires_at} />
                                    )}
                                </div>
                                <p className="font-didot text-xs text-wood-accent/50 truncate">
                                    {c.email ?? '—'}{c.phone ? ` · ${c.phone}` : ''}
                                </p>
                            </div>
                            <svg className="w-3.5 h-3.5 text-wood-accent/20 group-hover:text-wood-accent/50 shrink-0 ml-2 transition-colors duration-150" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 1l6 6-6 6" />
                            </svg>
                        </button>
                    );
                })}
            </div>

            {/* Add client */}
            <div className="px-6 py-4 border-t border-wood-accent/10">
                <button
                    onClick={() => setShowAddClient(true)}
                    disabled={isPast || spotsRemaining === 0}
                    className="w-full font-didot text-xs tracking-wide bg-wood-accent text-white hover:bg-wood-dark py-2.5 rounded-lg transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-wood-accent"
                >
                    + Add Client
                </button>
            </div>

            {detailBooking && (
                <BookingDetailModal
                    booking={detailBooking}
                    isPast={isPast}
                    onClose={() => setDetailBooking(null)}
                    onDeleted={() => {
                        setClients(cs => cs.filter(c => c.id !== detailBooking.id));
                        setSpotsRemaining(s => s + 1);
                        setDetailBooking(null);
                        onUpdated();
                    }}
                />
            )}

            {showAddClient && (
                <AddClientModal
                    sessionId={session.id}
                    onClose={() => setShowAddClient(false)}
                    onBooked={() => {
                        fetchClients();
                        setSpotsRemaining(s => s - 1);
                        onUpdated();
                    }}
                />
            )}
        </div>
    );
}


function ScopeChooser({
    onClose,
    onPick,
}: {
    onClose: () => void;
    onPick: (scope: 'this' | 'following') => void;
}) {
    const [closing, setClosing] = useState(false);
    const requestClose = () => setClosing(true);
    const handleAnimationEnd = () => { if (closing) onClose(); };

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-5 pb-5 sm:pb-0">
            <div
                className={`absolute inset-0 bg-black/40 backdrop-blur-sm ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
                onClick={requestClose}
            />
            <div
                className={`relative w-full max-w-sm bg-wood-light rounded-xl border border-wood-accent/20 px-5 py-5 flex flex-col gap-2 ${closing ? 'animate-modal-out' : 'animate-modal-in'}`}
                onAnimationEnd={handleAnimationEnd}
            >
                <p className="font-cormorant text-lg text-wood-dark mb-1">This is a recurring session</p>
                <p className="font-didot text-xs text-wood-accent/60 mb-3">What would you like to cancel?</p>

                <button
                    onClick={() => onPick('this')}
                    className="w-full text-left font-didot text-sm tracking-wide text-wood-dark hover:bg-wood-accent/10 rounded-lg px-4 py-3 transition-colors"
                >
                    This session only
                </button>
                <button
                    onClick={() => onPick('following')}
                    className="w-full text-left font-didot text-sm tracking-wide text-red-500 hover:bg-red-50 rounded-lg px-4 py-3 transition-colors"
                >
                    This and all following
                </button>
                <button
                    onClick={requestClose}
                    className="w-full text-center font-didot text-xs tracking-widest uppercase text-wood-accent/50 hover:text-wood-dark py-2 mt-1 transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
