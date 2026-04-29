import { useEffect, useMemo, useState } from 'react';
import { BASE } from '../../utils/apiUtils';
import { formatDate } from '../../utils/dateUtils';
import { type TransactionType } from '../../components/admin/modals/TransactionModal';

type RangePreset = '7d' | '30d' | '90d' | 'ytd' | '12m' | 'all';

const PRESETS: { key: RangePreset; label: string }[] = [
    { key: '7d', label: 'Last 7 days' },
    { key: '30d', label: 'Last 30 days' },
    { key: '90d', label: 'Last 90 days' },
    { key: 'ytd', label: 'Year to date' },
    { key: '12m', label: 'Last 12 months' },
    { key: 'all', label: 'All time' },
];

function rangeFor(preset: RangePreset, all: TransactionType[]): { from: Date; to: Date } {
    const to = new Date();
    const from = new Date(to);
    switch (preset) {
        case '7d': from.setDate(to.getDate() - 6); break;
        case '30d': from.setDate(to.getDate() - 29); break;
        case '90d': from.setDate(to.getDate() - 89); break;
        case 'ytd': from.setMonth(0, 1); break;
        case '12m': from.setFullYear(to.getFullYear() - 1); break;
        case 'all': {
            const earliest = all.reduce<number>((min, t) => {
                const ts = new Date(t.created_at).getTime();
                return ts < min ? ts : min;
            }, Date.now());
            return { from: new Date(earliest), to };
        }
    }
    from.setHours(0, 0, 0, 0);
    return { from, to };
}

function fmtCurrency(n: number, currency: string): string {
    return `${n.toFixed(2)} ${currency}`;
}

function monthKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-AU', { month: 'short', year: '2-digit' });
}

export default function Finance() {
    const [transactions, setTransactions] = useState<TransactionType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [preset, setPreset] = useState<RangePreset>('30d');

    useEffect(() => {
        const token = localStorage.getItem('access_token') ?? '';
        fetch(`${BASE}/api/admin/payments`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(j => setTransactions(j.results ?? []))
            .catch(() => setError('Failed to load finance data.'))
            .finally(() => setLoading(false));
    }, []);

    const { from, to } = useMemo(() => rangeFor(preset, transactions), [preset, transactions]);
    const currency = transactions[0]?.currency ?? 'AUD';

    const inRange = useMemo(
        () => transactions.filter(t => {
            const ts = new Date(t.created_at).getTime();
            return ts >= from.getTime() && ts <= to.getTime();
        }),
        [transactions, from, to]
    );

    const totals = useMemo(() => {
        let gross = 0;
        let refunded = 0;
        let lateFees = 0;
        let pending = 0;
        let succeededCount = 0;
        let refundedCount = 0;

        for (const t of inRange) {
            if (t.status === 'succeeded') {
                gross += Number(t.amount);
                succeededCount++;
            }
            if (t.status === 'pending') {
                pending += Number(t.amount);
            }
            if (t.refund_amount) {
                const refundAmt = Number(t.refund_amount);
                refunded += refundAmt;
                refundedCount++;
                const original = Number(t.amount);
                const fee = original - refundAmt;
                if (fee > 0.001) lateFees += fee;
            }
        }
        return {
            gross,
            refunded,
            net: gross - refunded,
            lateFees,
            pending,
            succeededCount,
            refundedCount,
        };
    }, [inRange]);

    const monthlySeries = useMemo(() => {
        const buckets = new Map<string, { gross: number; refunded: number }>();
        // seed empty months across the visible range so the chart shows gaps
        const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
        const end = new Date(to.getFullYear(), to.getMonth(), 1);
        while (cursor <= end) {
            buckets.set(monthKey(cursor), { gross: 0, refunded: 0 });
            cursor.setMonth(cursor.getMonth() + 1);
        }
        for (const t of inRange) {
            const created = new Date(t.created_at);
            const key = monthKey(created);
            const bucket = buckets.get(key) ?? { gross: 0, refunded: 0 };
            if (t.status === 'succeeded') bucket.gross += Number(t.amount);
            if (t.refund_amount) bucket.refunded += Number(t.refund_amount);
            buckets.set(key, bucket);
        }
        return Array.from(buckets.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, v]) => ({ key, label: monthLabel(key), ...v, net: v.gross - v.refunded }));
    }, [inRange, from, to]);

    const peakNet = monthlySeries.reduce((m, b) => Math.max(m, b.net, b.gross), 0);

    // Top methods within range
    const byMethod = useMemo(() => {
        const acc = new Map<string, { gross: number; refunded: number; count: number }>();
        for (const t of inRange) {
            const name = t.method_name ?? 'Unspecified';
            const cur = acc.get(name) ?? { gross: 0, refunded: 0, count: 0 };
            if (t.status === 'succeeded') {
                cur.gross += Number(t.amount);
                cur.count++;
            }
            if (t.refund_amount) cur.refunded += Number(t.refund_amount);
            acc.set(name, cur);
        }
        return Array.from(acc.entries())
            .map(([name, v]) => ({ name, ...v, net: v.gross - v.refunded }))
            .sort((a, b) => b.net - a.net)
            .slice(0, 5);
    }, [inRange]);

    return (
        <div className="flex flex-col flex-1 min-h-0 bg-wood-dark/5 h-full">
            {/* Toolbar */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-wood-accent/10 bg-wood-light shrink-0">
                <h1 className="font-cormorant text-2xl text-wood-dark">Finance</h1>
                <div className="ml-auto flex items-center gap-1 flex-wrap">
                    {PRESETS.map(p => (
                        <button
                            key={p.key}
                            onClick={() => setPreset(p.key)}
                            className={`font-didot text-[10px] tracking-widest uppercase px-3 py-1.5 rounded-lg transition-colors duration-200 ${preset === p.key ? 'bg-wood-accent text-white' : 'text-wood-accent/50 hover:text-wood-dark'}`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                {loading && <p className="font-didot text-xs text-wood-accent/40 tracking-widest">Loading…</p>}
                {error && <p className="font-didot text-xs text-red-400 tracking-widest">{error}</p>}

                {!loading && !error && (
                    <>
                        <p className="font-didot text-[11px] tracking-widest uppercase text-wood-accent/40">
                            {formatDate(from)} — {formatDate(to)}
                        </p>

                        {/* KPI cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <Kpi
                                label="Gross Revenue"
                                value={fmtCurrency(totals.gross, currency)}
                                sub={`${totals.succeededCount} payment${totals.succeededCount === 1 ? '' : 's'}`}
                            />
                            <Kpi
                                label="Refunded"
                                value={fmtCurrency(totals.refunded, currency)}
                                sub={`${totals.refundedCount} refund${totals.refundedCount === 1 ? '' : 's'}`}
                                tone="warn"
                            />
                            <Kpi
                                label="Net Revenue"
                                value={fmtCurrency(totals.net, currency)}
                                sub={`+ ${fmtCurrency(totals.lateFees, currency)} late fees retained`}
                                tone="primary"
                            />
                            <Kpi
                                label="Pending"
                                value={fmtCurrency(totals.pending, currency)}
                                sub="awaiting capture"
                                tone="muted"
                            />
                        </div>

                        {/* Monthly chart */}
                        <section className="bg-wood-light border border-wood-accent/10 rounded-xl p-5 flex flex-col gap-4">
                            <div className="flex items-baseline justify-between">
                                <h2 className="font-cormorant text-xl text-wood-dark">Monthly cashflow</h2>
                                <div className="flex items-center gap-3 text-[10px] font-didot tracking-widest uppercase text-wood-accent/50">
                                    <Legend swatch="bg-emerald-500/70" label="Net" />
                                    <Legend swatch="bg-red-400/70" label="Refunded" />
                                </div>
                            </div>
                            {monthlySeries.length === 0 || peakNet === 0 ? (
                                <p className="font-didot text-xs text-wood-accent/40 tracking-widest py-8 text-center">
                                    No revenue in this range.
                                </p>
                            ) : (
                                <div className="flex items-end gap-2 h-48 overflow-x-auto pb-2">
                                    {monthlySeries.map(m => {
                                        const netH = peakNet > 0 ? Math.round((Math.max(0, m.net) / peakNet) * 100) : 0;
                                        const refH = peakNet > 0 ? Math.round((m.refunded / peakNet) * 100) : 0;
                                        return (
                                            <div key={m.key} className="flex flex-col items-center gap-1 min-w-[40px] flex-1">
                                                <div className="flex items-end gap-0.5 h-40 w-full justify-center">
                                                    <div
                                                        className="w-3.5 bg-emerald-500/70 rounded-t transition-all"
                                                        style={{ height: `${netH}%` }}
                                                        title={`Net ${fmtCurrency(m.net, currency)}`}
                                                    />
                                                    {m.refunded > 0 && (
                                                        <div
                                                            className="w-3.5 bg-red-400/70 rounded-t transition-all"
                                                            style={{ height: `${refH}%` }}
                                                            title={`Refunded ${fmtCurrency(m.refunded, currency)}`}
                                                        />
                                                    )}
                                                </div>
                                                <span className="font-didot text-[9px] tracking-widest uppercase text-wood-accent/50 whitespace-nowrap">
                                                    {m.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        {/* Top methods */}
                        <section className="bg-wood-light border border-wood-accent/10 rounded-xl p-5 flex flex-col gap-3">
                            <h2 className="font-cormorant text-xl text-wood-dark">Top methods</h2>
                            {byMethod.length === 0 ? (
                                <p className="font-didot text-xs text-wood-accent/40 tracking-widest">No data.</p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {byMethod.map(m => {
                                        const pct = totals.net > 0 ? Math.round((m.net / totals.net) * 100) : 0;
                                        return (
                                            <div key={m.name} className="flex items-center gap-3">
                                                <div className="w-32 shrink-0">
                                                    <p className="font-cormorant text-sm text-wood-dark truncate">{m.name}</p>
                                                    <p className="font-didot text-[10px] text-wood-accent/50 tracking-wide">{m.count} sold</p>
                                                </div>
                                                <div className="flex-1 h-2 bg-wood-dark/5 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-wood-accent/60 rounded-full"
                                                        style={{ width: `${Math.max(2, pct)}%` }}
                                                    />
                                                </div>
                                                <p className="font-didot text-xs text-wood-dark/80 text-right w-28 shrink-0">
                                                    {fmtCurrency(m.net, currency)}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </>
                )}
            </div>
        </div>
    );
}

function Kpi({
    label,
    value,
    sub,
    tone = 'default',
}: {
    label: string;
    value: string;
    sub?: string;
    tone?: 'default' | 'primary' | 'warn' | 'muted';
}) {
    const valueClass =
        tone === 'primary' ? 'text-wood-dark'
        : tone === 'warn' ? 'text-red-500/80'
        : tone === 'muted' ? 'text-wood-accent/60'
        : 'text-wood-dark';
    return (
        <div className="bg-wood-light border border-wood-accent/10 rounded-xl px-5 py-4 flex flex-col gap-1">
            <p className="font-didot text-[10px] tracking-widest uppercase text-wood-accent/50">{label}</p>
            <p className={`font-cormorant text-2xl ${valueClass}`}>{value}</p>
            {sub && <p className="font-didot text-[10px] text-wood-accent/40 tracking-wide truncate">{sub}</p>}
        </div>
    );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
    return (
        <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-sm ${swatch}`} />
            {label}
        </span>
    );
}
