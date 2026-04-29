import { useEffect, useState } from 'react';
import { BASE } from '../../../utils/apiUtils';
import { formatDate, formatTime } from '../../../utils/dateUtils';

export type TransactionType = {
    id: string;
    booking_id: string;
    user_id: string | null;
    payment_intent_id: string | null;
    merchant_order_id: string | null;
    amount: string;
    currency: string;
    status: string;
    expires_at: string | null;
    invoice_sent_at: string | null;
    refund_id: string | null;
    refund_amount: string | null;
    refunded_at: string | null;
    created_at: string;
    updated_at: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    method_name: string | null;
    session_start: string | null;
    session_instructor: string | null;
    is_guest: boolean | null;
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-600',
    succeeded: 'bg-emerald-50 text-emerald-700',
    failed: 'bg-red-50 text-red-500',
    cancelled: 'bg-wood-dark/5 text-wood-accent/50',
};

type Props = {
    bookingId?: string;
    transaction?: TransactionType;
    onClose: () => void;
};

function fmtDateTime(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${formatDate(d)} · ${formatTime(d)}`;
}

function fmtMoney(amount: string | null, currency: string): string {
    if (amount == null) return '—';
    return `${amount} ${currency}`;
}

export default function TransactionModal({ bookingId, transaction: initial, onClose }: Props) {
    const [closing, setClosing] = useState(false);
    const [transaction, setTransaction] = useState<TransactionType | null>(initial ?? null);
    const [loading, setLoading] = useState(!initial && !!bookingId);
    const [error, setError] = useState<string | null>(null);

    const handleClose = () => setClosing(true);
    const handleAnimationEnd = () => { if (closing) onClose(); };

    useEffect(() => {
        if (initial || !bookingId) return;
        const token = localStorage.getItem('access_token') ?? '';
        setLoading(true);
        fetch(`${BASE}/api/admin/payments/booking/${bookingId}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => {
                if (r.status === 404) { setError('No transaction recorded for this booking.'); return null; }
                return r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`));
            })
            .then((j: TransactionType | null) => { if (j) setTransaction(j); })
            .catch(() => setError('Failed to load transaction.'))
            .finally(() => setLoading(false));
    }, [bookingId, initial]);

    const fullName = transaction
        ? `${transaction.first_name ?? ''} ${transaction.last_name ?? ''}`.trim() || '—'
        : '';

    const statusStyle = transaction
        ? PAYMENT_STATUS_STYLES[transaction.status] ?? 'bg-wood-dark/5 text-wood-accent/50'
        : '';

    const grossAmount = transaction ? Number(transaction.amount) : 0;
    const refundedAmount = transaction?.refund_amount ? Number(transaction.refund_amount) : 0;
    const netAmount = grossAmount - refundedAmount;
    const wasRefunded = transaction?.refunded_at != null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className={`absolute inset-0 bg-black/40 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
                onClick={handleClose}
            />
            <div
                className={`relative bg-wood-light w-full max-w-md mx-4 rounded-xl shadow-xl overflow-hidden opacity-0 ${closing ? 'animate-modal-out' : 'animate-modal-in'}`}
                onAnimationEnd={handleAnimationEnd}
            >
                <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-wood-accent/10">
                    <div>
                        <p className="font-didot text-[10px] tracking-widest uppercase text-wood-accent/50">Transaction</p>
                        <p className="font-cormorant text-2xl text-wood-dark leading-tight mt-0.5">
                            {transaction ? fmtMoney(transaction.amount, transaction.currency) : 'Loading…'}
                        </p>
                        {transaction && (
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span className={`font-didot text-[9px] tracking-widest uppercase px-2 py-0.5 rounded-full ${statusStyle}`}>
                                    {transaction.status}
                                </span>
                                {wasRefunded && (
                                    <span className="font-didot text-[9px] tracking-widest uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                                        Refunded
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    <button onClick={handleClose} className="font-didot text-wood-accent/40 hover:text-wood-dark text-3xl leading-none ml-2 shrink-0 transition-colors">×</button>
                </div>

                <div className="px-6 py-4 flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
                    {loading && (
                        <p className="font-didot text-xs text-wood-accent/40 tracking-widest">Loading transaction…</p>
                    )}
                    {error && (
                        <p className="font-didot text-xs text-red-400 tracking-widest">{error}</p>
                    )}

                    {transaction && (
                        <>
                            {/* Client + session */}
                            <div className="bg-wood-dark/5 rounded-lg px-4 py-3 flex flex-col gap-2">
                                <Row label="Client" value={fullName || '—'} />
                                {transaction.email && <Row label="Email" value={transaction.email} />}
                                {transaction.method_name && <Row label="Method" value={transaction.method_name} />}
                                {transaction.session_start && (
                                    <Row label="Session" value={fmtDateTime(transaction.session_start)} />
                                )}
                            </div>

                            {/* Money breakdown */}
                            <div className="bg-wood-dark/5 rounded-lg px-4 py-3 flex flex-col gap-2">
                                <Row
                                    label="Charged"
                                    value={fmtMoney(transaction.amount, transaction.currency)}
                                />
                                {wasRefunded && (
                                    <>
                                        <Row
                                            label="Refunded"
                                            value={`−${fmtMoney(transaction.refund_amount, transaction.currency)}`}
                                            valueClass="text-red-500"
                                        />
                                        <div className="border-t border-wood-accent/10 mt-1 pt-2">
                                            <Row
                                                label="Net"
                                                value={`${netAmount.toFixed(2)} ${transaction.currency}`}
                                                emphasize
                                            />
                                        </div>
                                        <Row label="Refunded At" value={fmtDateTime(transaction.refunded_at)} />
                                    </>
                                )}
                            </div>

                            {/* Identifiers + timestamps */}
                            <div className="bg-wood-dark/5 rounded-lg px-4 py-3 flex flex-col gap-2">
                                <Row
                                    label="Payment Intent"
                                    value={transaction.payment_intent_id ?? '—'}
                                    mono
                                />
                                {transaction.merchant_order_id && (
                                    <Row label="Order" value={transaction.merchant_order_id} mono />
                                )}
                                {transaction.refund_id && (
                                    <Row label="Refund ID" value={transaction.refund_id} mono />
                                )}
                                <Row label="Created" value={fmtDateTime(transaction.created_at)} />
                                <Row label="Updated" value={fmtDateTime(transaction.updated_at)} />
                                {transaction.invoice_sent_at && (
                                    <Row label="Invoice Sent" value={fmtDateTime(transaction.invoice_sent_at)} />
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function Row({
    label,
    value,
    mono,
    emphasize,
    valueClass,
}: {
    label: string;
    value: string;
    mono?: boolean;
    emphasize?: boolean;
    valueClass?: string;
}) {
    return (
        <div className="flex items-baseline justify-between gap-3">
            <span className="font-didot text-[10px] tracking-widest uppercase text-wood-accent/50 shrink-0">{label}</span>
            <span
                className={`text-right break-all ${mono ? 'font-mono text-[11px]' : 'font-didot text-xs'} ${
                    emphasize ? 'font-cormorant text-base text-wood-dark' : valueClass ?? 'text-wood-dark/80'
                }`}
            >
                {value}
            </span>
        </div>
    );
}