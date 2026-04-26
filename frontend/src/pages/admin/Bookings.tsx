import { useState, useEffect, useMemo } from 'react';
import { formatDate, formatTime } from '../../utils/dateUtils';

function toLocalDateString(date: Date) {
    return date.toISOString().slice(0, 10);
}

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

type Booking = {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    is_guest: boolean;
    role: string | null;
    status: string;
    cancellation_type: string | null;
    cancelled_at: string | null;
    session_start: string | null;
    session_end: string | null;
    session_instructor: string | null;
    session_method_name: string | null;
};

const STATUS_STYLES: Record<string, string> = {
    booked: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-600',
};

const CANCEL_TYPE_STYLES: Record<string, string> = {
    early: 'bg-wood-accent/10 text-wood-accent/70',
    late: 'bg-red-100 text-red-500',
};

type StatusFilter = 'all' | 'booked' | 'cancelled';

const inputCls = 'font-didot text-xs tracking-wide text-wood-dark bg-wood-dark/5 border border-wood-accent/10 rounded-lg focus:outline-none focus:border-wood-accent/30 placeholder:text-wood-accent/30 transition-colors duration-200';

function Initials({ name }: { name: string }) {
    const parts = name.trim().split(' ');
    const letters = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
    return (
        <div className="w-10 h-10 rounded-full bg-wood-accent/20 flex items-center justify-center shrink-0">
            <span className="font-cormorant text-base text-wood-dark uppercase">{letters}</span>
        </div>
    );
}

function BookingRow({ booking, onCancelled }: { booking: Booking; onCancelled: (id: string) => void }) {
    const [cancelling, setCancelling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fullName = `${booking.first_name} ${booking.last_name}`;
    const isBooked = booking.status === 'booked';

    const handleCancel = async () => {
        if (!confirm(`Cancel booking for ${fullName}?`)) return;
        setCancelling(true);
        setError(null);
        const token = localStorage.getItem('access_token') ?? '';
        try {
            const res = await fetch(`${BASE}/api/bookings/${booking.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
            onCancelled(booking.id);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setCancelling(false);
        }
    };

    return (
        <div className="flex items-center gap-4 bg-wood-light border border-wood-accent/10 rounded-xl px-4 py-3 hover:border-wood-accent/20 transition-all duration-200">
            <Initials name={fullName} />

            {/* Client */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-cormorant text-lg text-wood-dark leading-tight truncate">{fullName}</p>
                    {booking.is_guest && (
                        <span className="font-didot text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded-full bg-wood-accent/10 text-wood-accent/60 shrink-0">Guest</span>
                    )}
                </div>
                {booking.email && (
                    <p className="font-didot text-xs text-wood-accent/50 truncate">{booking.email}</p>
                )}
            </div>

            {/* Session */}
            <div className="hidden sm:flex flex-col min-w-0 w-44 shrink-0">
                <p className="font-cormorant text-base text-wood-dark truncate">{booking.session_method_name ?? '—'}</p>
                {booking.session_start && (
                    <p className="font-didot text-xs text-wood-accent/50 truncate">
                        {formatDate(new Date(booking.session_start))} · {formatTime(new Date(booking.session_start))}
                    </p>
                )}
                {booking.session_instructor && (
                    <p className="font-didot text-[10px] tracking-widest uppercase text-wood-accent/40 truncate">{booking.session_instructor}</p>
                )}
            </div>

            {/* Status */}
            <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className={`font-didot text-[9px] tracking-widest uppercase px-2 py-0.5 rounded-full ${STATUS_STYLES[booking.status] ?? STATUS_STYLES.booked}`}>
                    {booking.status}
                </span>
                {booking.cancellation_type && (
                    <span className={`font-didot text-[9px] tracking-widest uppercase px-2 py-0.5 rounded-full ${CANCEL_TYPE_STYLES[booking.cancellation_type] ?? ''}`}>
                        {booking.cancellation_type}
                    </span>
                )}
                {error && <p className="font-didot text-[10px] text-red-500">{error}</p>}
                {isBooked && (
                    <button
                        onClick={handleCancel}
                        disabled={cancelling}
                        className="font-didot text-[10px] tracking-widest uppercase text-wood-accent/30 hover:text-red-500 transition-colors duration-200 disabled:opacity-40"
                    >
                        {cancelling ? '…' : 'Cancel'}
                    </button>
                )}
            </div>
        </div>
    );
}

export default function Bookings() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [instructorFilter, setInstructorFilter] = useState('');

    useEffect(() => {
        fetch(`${BASE}/api/bookings`)
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(j => setBookings(j.results ?? []))
            .catch(() => setError('Failed to load bookings.'))
            .finally(() => setLoading(false));
    }, []);

    const instructors = useMemo(() => {
        const set = new Set<string>();
        bookings.forEach(b => { if (b.session_instructor) set.add(b.session_instructor); });
        return Array.from(set).sort();
    }, [bookings]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        const from = dateFrom ? new Date(dateFrom) : null;
        const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;
        return bookings.filter(b => {
            if (statusFilter !== 'all' && b.status !== statusFilter) return false;
            if (instructorFilter && b.session_instructor !== instructorFilter) return false;
            if (from || to) {
                const start = b.session_start ? new Date(b.session_start) : null;
                if (!start) return false;
                if (from && start < from) return false;
                if (to && start > to) return false;
            }
            if (!q) return true;
            const name = `${b.first_name} ${b.last_name}`.toLowerCase();
            return (
                name.includes(q) ||
                (b.email ?? '').toLowerCase().includes(q) ||
                (b.session_method_name ?? '').toLowerCase().includes(q) ||
                (b.session_instructor ?? '').toLowerCase().includes(q)
            );
        });
    }, [bookings, search, statusFilter, dateFrom, dateTo, instructorFilter]);

    const counts = useMemo(() => ({
        all: bookings.length,
        booked: bookings.filter(b => b.status === 'booked').length,
        cancelled: bookings.filter(b => b.status === 'cancelled').length,
    }), [bookings]);

    const STATUS_TABS: { key: StatusFilter; label: string }[] = [
        { key: 'all', label: `All · ${counts.all}` },
        { key: 'booked', label: `Booked · ${counts.booked}` },
        { key: 'cancelled', label: `Cancelled · ${counts.cancelled}` },
    ];

    return (
        <div className="flex flex-col flex-1 min-h-0 bg-wood-dark/5">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 px-6 py-4 border-b border-wood-accent/10 bg-wood-light shrink-0">
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-wood-accent/40 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                        </svg>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name, email, or session…"
                            className="w-full pl-8 pr-3 py-2 font-didot text-xs tracking-wide text-wood-dark bg-wood-dark/5 border border-wood-accent/10 rounded-lg focus:outline-none focus:border-wood-accent/30 placeholder:text-wood-accent/30 transition-colors duration-200"
                        />
                    </div>
                    <p className="font-didot text-xs text-wood-accent/40 tracking-widest shrink-0 ml-auto">
                        {filtered.length} {filtered.length === 1 ? 'booking' : 'bookings'}
                    </p>
                </div>

                {/* Date + instructor filters */}
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                        className={`${inputCls} px-3 py-2`}
                    />
                    <span className="font-didot text-[10px] text-wood-accent/40 tracking-widest">to</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                        className={`${inputCls} px-3 py-2`}
                    />
                    <select
                        value={instructorFilter}
                        onChange={e => setInstructorFilter(e.target.value)}
                        className={`${inputCls} px-3 py-2`}
                    >
                        <option value="">All Instructors</option>
                        {instructors.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                    {(dateFrom || dateTo || instructorFilter) && (
                        <button
                            onClick={() => { setDateFrom(''); setDateTo(''); setInstructorFilter(''); }}
                            className="font-didot text-[10px] tracking-widest uppercase text-wood-accent/40 hover:text-red-400 transition-colors duration-200"
                        >
                            Clear
                        </button>
                    )}
                </div>

                {/* Status tabs */}
                <div className="flex gap-1">
                    {STATUS_TABS.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setStatusFilter(key)}
                            className={`font-didot text-[10px] tracking-widest uppercase px-3 py-1.5 rounded-lg transition-colors duration-200 ${statusFilter === key ? 'bg-wood-accent text-white' : 'text-wood-accent/50 hover:text-wood-dark'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6">
                {loading && <p className="font-didot text-xs text-wood-accent/40 tracking-widest">Loading…</p>}
                {error && <p className="font-didot text-xs text-red-400 tracking-widest">{error}</p>}
                {!loading && !error && filtered.length === 0 && (
                    <p className="font-didot text-xs text-wood-accent/40 tracking-widest">No bookings found.</p>
                )}
                <div className="flex flex-col gap-2">
                    {filtered.map(b => (
                        <BookingRow
                            key={b.id}
                            booking={b}
                            onCancelled={id => setBookings(prev => prev.filter(x => x.id !== id))}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
