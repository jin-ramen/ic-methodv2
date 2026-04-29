import { useEffect, useMemo, useState } from 'react';
import Initials from '../../components/admin/Initials';
import { formatDate, formatTime, toDateKey } from '../../utils/dateUtils';
import { BASE } from '../../utils/apiUtils';
import TransactionModal, { type TransactionType } from '../../components/admin/modals/TransactionModal';
import CalendarModalAdmin from '../../components/admin/modals/CalendarModalAdmin';

const PAYMENT_STATUS_STYLES: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-600',
    succeeded: 'bg-emerald-50 text-emerald-700',
    failed: 'bg-red-50 text-red-500',
    cancelled: 'bg-wood-dark/5 text-wood-accent/50',
};

type StatusFilter = 'all' | 'succeeded' | 'pending' | 'refunded' | 'failed' | 'cancelled';

const inputCls = 'font-didot text-xs tracking-wide text-wood-dark bg-wood-dark/5 border border-wood-accent/10 rounded-lg focus:outline-none focus:border-wood-accent/30 placeholder:text-wood-accent/30 transition-colors duration-200';

export default function Transactions() {
    const [transactions, setTransactions] = useState<TransactionType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [dateFilter, setDateFilter] = useState<Date | null>(null);
    const [instructorFilter, setInstructorFilter] = useState('');
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [selected, setSelected] = useState<TransactionType | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('access_token') ?? '';
        fetch(`${BASE}/api/admin/payments`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(j => setTransactions(j.results ?? []))
            .catch(() => setError('Failed to load transactions.'))
            .finally(() => setLoading(false));
    }, []);

    const instructors = useMemo(() => {
        const set = new Set<string>();
        transactions.forEach(t => { if (t.session_instructor) set.add(t.session_instructor); });
        return Array.from(set).sort();
    }, [transactions]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        const dayKey = dateFilter ? toDateKey(dateFilter) : null;
        return transactions.filter(t => {
            if (statusFilter === 'refunded') {
                if (!t.refunded_at) return false;
            } else if (statusFilter !== 'all') {
                if (t.status !== statusFilter) return false;
            }
            if (instructorFilter && t.session_instructor !== instructorFilter) return false;
            if (dayKey && toDateKey(new Date(t.created_at)) !== dayKey) return false;
            if (!q) return true;
            const name = `${t.first_name ?? ''} ${t.last_name ?? ''}`.toLowerCase();
            return (
                name.includes(q) ||
                (t.email ?? '').toLowerCase().includes(q) ||
                (t.method_name ?? '').toLowerCase().includes(q) ||
                (t.payment_intent_id ?? '').toLowerCase().includes(q) ||
                (t.merchant_order_id ?? '').toLowerCase().includes(q)
            );
        });
    }, [transactions, search, statusFilter, dateFilter, instructorFilter]);

    const counts = useMemo(() => transactions.reduce(
        (acc, t) => {
            acc.all++;
            if (t.status === 'succeeded') acc.succeeded++;
            else if (t.status === 'pending') acc.pending++;
            else if (t.status === 'failed') acc.failed++;
            else if (t.status === 'cancelled') acc.cancelled++;
            if (t.refunded_at) acc.refunded++;
            return acc;
        },
        { all: 0, succeeded: 0, pending: 0, refunded: 0, failed: 0, cancelled: 0 }
    ), [transactions]);

    const totals = useMemo(() => {
        let gross = 0;
        let refunded = 0;
        let currency = 'AUD';
        for (const t of filtered) {
            currency = t.currency || currency;
            if (t.status === 'succeeded') gross += Number(t.amount);
            if (t.refund_amount) refunded += Number(t.refund_amount);
        }
        return { gross, refunded, net: gross - refunded, currency };
    }, [filtered]);

    const STATUS_TABS: { key: StatusFilter; label: string }[] = [
        { key: 'all', label: `All · ${counts.all}` },
        { key: 'succeeded', label: `Succeeded · ${counts.succeeded}` },
        { key: 'pending', label: `Pending · ${counts.pending}` },
        { key: 'refunded', label: `Refunded · ${counts.refunded}` },
        { key: 'failed', label: `Failed · ${counts.failed}` },
        { key: 'cancelled', label: `Cancelled · ${counts.cancelled}` },
    ];

    return (
        <div className="flex flex-col flex-1 min-h-0 bg-wood-dark/5 h-full">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 px-6 py-4 border-b border-wood-accent/10 bg-wood-light shrink-0">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-wood-accent/40 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name…"
                            className="w-full pl-8 pr-3 py-2 font-didot text-xs tracking-wide text-wood-dark bg-wood-dark/5 border border-wood-accent/10 rounded-lg focus:outline-none focus:border-wood-accent/30 placeholder:text-wood-accent/30 transition-colors duration-200"
                        />
                    </div>

                    <button
                        onClick={() => setCalendarOpen(true)}
                        className={`${inputCls} px-3 py-2 flex items-center gap-2 ${dateFilter ? 'text-wood-dark' : 'text-wood-accent/50'}`}
                    >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                        </svg>
                        {dateFilter ? formatDate(dateFilter) : 'Any date'}
                        {dateFilter && (
                            <span
                                role="button"
                                tabIndex={0}
                                onClick={e => { e.stopPropagation(); setDateFilter(null); }}
                                onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); setDateFilter(null); } }}
                                className="ml-1 text-wood-accent/40 hover:text-red-400 cursor-pointer"
                            >
                                ×
                            </span>
                        )}
                    </button>

                    <select
                        value={instructorFilter}
                        onChange={e => setInstructorFilter(e.target.value)}
                        className={`${inputCls} px-3 py-2`}
                    >
                        <option value="">All Instructors</option>
                        {instructors.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>

                    {/* Totals */}
                    <div className="ml-auto flex items-baseline gap-4">
                        <Total label="Gross" value={`${totals.gross.toFixed(2)} ${totals.currency}`} />
                        <Total label="Refunded" value={`${totals.refunded.toFixed(2)} ${totals.currency}`} />
                        <Total label="Net" value={`${totals.net.toFixed(2)} ${totals.currency}`} emphasize />
                    </div>
                </div>

                {/* Status tabs */}
                <div className="flex gap-1 flex-wrap">
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
                    <p className="font-didot text-xs text-wood-accent/40 tracking-widest">No transactions found.</p>
                )}
                <div className="flex flex-col gap-2">
                    {filtered.map(t => (
                        <TransactionRow key={t.id} transaction={t} onClick={() => setSelected(t)} />
                    ))}
                </div>
            </div>

            {calendarOpen && (
                <CalendarModalAdmin
                    value={dateFilter}
                    onSelect={d => setDateFilter(d)}
                    onClear={() => setDateFilter(null)}
                    onClose={() => setCalendarOpen(false)}
                />
            )}

            {selected && (
                <TransactionModal transaction={selected} onClose={() => setSelected(null)} />
            )}
        </div>
    );
}

function TransactionRow({ transaction, onClick }: { transaction: TransactionType; onClick: () => void }) {
    const fullName = `${transaction.first_name ?? ''} ${transaction.last_name ?? ''}`.trim() || '—';
    const created = new Date(transaction.created_at);
    const refunded = transaction.refunded_at != null;

    return (
        <button
            onClick={onClick}
            className="text-left flex items-center gap-4 bg-wood-light border border-wood-accent/10 rounded-xl px-4 py-3 hover:border-wood-accent/30 transition-all duration-200"
        >
            <Initials name={fullName} size="sm" />

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-cormorant text-lg text-wood-dark leading-tight truncate">{fullName}</p>
                    {transaction.is_guest && (
                        <span className="font-didot text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded-full bg-wood-accent/10 text-wood-accent/60 shrink-0">Guest</span>
                    )}
                </div>
                {transaction.email && (
                    <p className="font-didot text-xs text-wood-accent/50 truncate">{transaction.email}</p>
                )}
            </div>

            <div className="hidden sm:flex flex-col min-w-0 w-44 shrink-0">
                <p className="font-cormorant text-base text-wood-dark truncate">{transaction.method_name ?? '—'}</p>
                <p className="font-didot text-xs text-wood-accent/50 truncate">
                    {formatDate(created)} · {formatTime(created)}
                </p>
                {transaction.payment_intent_id && (
                    <p className="font-mono text-[10px] text-wood-accent/40 truncate">{transaction.payment_intent_id}</p>
                )}
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
                <p className="font-cormorant text-base text-wood-dark">
                    {transaction.amount} {transaction.currency}
                </p>
                <span className={`font-didot text-[9px] tracking-widest uppercase px-2 py-0.5 rounded-full ${PAYMENT_STATUS_STYLES[transaction.status] ?? ''}`}>
                    {transaction.status}
                </span>
                {refunded && (
                    <span className="font-didot text-[9px] tracking-widest uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                        −{transaction.refund_amount} refunded
                    </span>
                )}
            </div>
        </button>
    );
}

function Total({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
    return (
        <div className="flex flex-col items-end leading-tight">
            <span className="font-didot text-[9px] tracking-widest uppercase text-wood-accent/40">{label}</span>
            <span className={`${emphasize ? 'font-cormorant text-base text-wood-dark' : 'font-didot text-xs text-wood-accent/70'}`}>
                {value}
            </span>
        </div>
    );
}