import { useEffect, useState } from 'react';

export function HoldCountdown({ expiresAt }: { expiresAt: string }) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, []);
    const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
    if (remaining === 0) {
        return <span className="font-didot text-[9px] tracking-widest uppercase text-red-500">expired</span>;
    }
    const mm = Math.floor(remaining / 60).toString().padStart(2, '0');
    const ss = (remaining % 60).toString().padStart(2, '0');
    return (
        <span className={`font-didot text-[10px] tabular-nums tracking-widest ${remaining <= 60 ? 'text-red-500' : 'text-amber-700'}`}>
            holding {mm}:{ss}
        </span>
    );
}

export const BOOKING_STATUS_STYLES: Record<string, string> = {
    booked: 'bg-emerald-100 text-emerald-700',
    pending_payment: 'bg-amber-100 text-amber-700',
    completed: 'bg-stone-100 text-stone-600',
    payment_failed: 'bg-rose-100 text-rose-700',
    cancelled: 'bg-red-100 text-red-600',
};

export const BOOKING_STATUS_LABELS: Record<string, string> = {
    booked: 'booked',
    pending_payment: 'awaiting payment',
    completed: 'completed',
    payment_failed: 'payment failed',
    cancelled: 'cancelled',
};
