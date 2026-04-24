import { useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'

import type { SessionType } from '../types/SessionType'

import { formatTime, formatDate } from '../utils/dateUtils'


const inputClass = "w-full bg-transparent border-b border-wood-text/30 focus:border-wood-text outline-none font-didot text-wood-text text-sm md:text-base py-2 md:py-3 tracking-wide transition-colors duration-200 placeholder:text-wood-text/30";
const labelClass = "font-didot text-wood-text/60 text-xs md:text-sm tracking-widest uppercase";

function SessionInfo({ session }: { session: SessionType }) {
    return (
        <div className="rounded-xl bg-wood-dark/80 px-6 py-6 flex flex-col gap-3">
            <p className="font-didot text-wood-text/40 text-xs tracking-widest uppercase">Your Session</p>
            <h2 className="font-cormorant text-wood-text text-4xl leading-tight">
                {formatTime(session.start_time)}<br />
                <span className="text-wood-text/60 text-2xl">– {formatTime(session.end_time)}</span>
            </h2>
            <p className="font-didot text-wood-text/80 text-sm tracking-widest mt-1">{formatDate(session.start_time)}</p>
            {session.instructor && (
                <p className="font-didot text-wood-text/50 text-xs tracking-widest mt-2">with {session.instructor}</p>
            )}
            <p className="font-didot text-wood-text/30 text-xs tracking-widest mt-1">
                {session.capacity} spot{session.capacity !== 1 ? 's' : ''} available
            </p>
        </div>
    );
}

type Props = { onBooked: () => void }

export default function BookingForm({ onBooked }: Props) {
    useParams<{ sessionId: string }>();
    const { state } = useLocation();
    const navigate = useNavigate();
    const session: SessionType | undefined = state?.session;
    const backHref = `/booking${state?.back ? `?${state.back}` : ''}`;

    const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', notes: '' });
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [leaving, setLeaving] = useState(false);

    if (!session) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <p className="font-didot text-wood-text text-sm tracking-widest">Session not found.</p>
                    <button onClick={() => navigate(backHref)} className="font-didot text-wood-text/50 text-xs tracking-widest underline underline-offset-4 mt-4">
                        ← Back to schedule
                    </button>
                </div>
            </div>
        );
    }

    const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(f => ({ ...f, [field]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        try {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: session.id, ...form }),
            });
            if (res.status === 429) {
                setErrorMsg('Too many attempts. Please wait a moment and try again.');
                setStatus('error');
                return;
            }
            if (res.status === 409) {
                const body = await res.json().catch(() => ({}));
                setErrorMsg(body.detail ?? 'This session is no longer available.');
                setStatus('error');
                return;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            onBooked();
            setLeaving(true);
            setTimeout(() => setStatus('success'), 300);
        } catch (err) {
            setErrorMsg((err as Error).message);
            setStatus('error');
        }
    };

    if (status === 'success') {
        return (
            <div className="flex-1 flex items-center justify-center px-5">
                <div className="text-center">
                    <p className="font-cormorant text-wood-dark text-4xl mb-3">You're booked.</p>
                    <p className="font-didot text-wood-accent text-sm tracking-widest mb-8">
                        See you on {formatDate(session.start_time)}.
                    </p>
                    <button onClick={() => navigate('/')} className="font-didot text-wood-accent/60 text-xs tracking-widest underline underline-offset-4">
                        ← Back to home
                    </button>
                </div>
            </div>
        );
    }

    const FormFields = (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 md:gap-8">
            <div className="flex flex-col gap-1">
                <label className={labelClass}>First name</label>
                <input required className={inputClass} placeholder="Jane" value={form.first_name} onChange={set('first_name')} />
            </div>
            <div className="flex flex-col gap-1">
                <label className={labelClass}>Last name</label>
                <input required className={inputClass} placeholder="Doe" value={form.last_name} onChange={set('last_name')} />
            </div>
            <div className="flex flex-col gap-1">
                <label className={labelClass}>Email</label>
                <input required type="email" className={inputClass} placeholder="jane@example.com" value={form.email} onChange={set('email')} />
            </div>
            <div className="flex flex-col gap-1">
                <label className={labelClass}>Phone <span className="opacity-40 normal-case">(optional)</span></label>
                <input className={inputClass} placeholder="+61 4xx xxx xxx" value={form.phone} onChange={set('phone')} />
            </div>
            <div className="flex flex-col gap-1">
                <label className={labelClass}>Notes <span className="opacity-40 normal-case">(optional)</span></label>
                <input className={inputClass} placeholder="Injuries or anything your instructor should know" value={form.notes} onChange={set('notes')} />
            </div>
            {status === 'error' && <p className="font-didot text-red-400 text-xs tracking-widest">{errorMsg}</p>}
            <button
                type="submit"
                disabled={status === 'loading'}
                className="mt-2 font-didot text-xs md:text-sm tracking-widest uppercase border border-wood-text/40 text-wood-text hover:bg-wood-text hover:text-wood-dark transition-all duration-200 py-3 md:py-4 px-6 disabled:opacity-40"
            >
                {status === 'loading' ? 'Booking...' : 'Confirm Commitment'}
            </button>
            <button type="button" onClick={() => navigate(backHref)} className="font-didot text-wood-text/30 text-xs tracking-widest">
                ← Back to calender
            </button>
        </form>
    );

    return (
        <div className="flex-1 flex flex-col items-center justify-center px-5">
            <div className={`rounded-xl bg-wood-accent/95 w-full md:max-w-5xl px-6 py-8 md:px-10 md:py-12 opacity-0 animate-fade-in ${leaving ? 'animate-fade-out' : ''}`} style={{ animationDuration: '0.4s', animationFillMode: 'forwards' }}>
                <div className="md:hidden flex flex-col gap-10">
                    <button type="button" onClick={() => navigate(backHref)} className="font-didot text-wood-text/40 text-xs tracking-widest text-left">
                        ← Back to calender
                    </button>
                    <SessionInfo session={session} />
                    {FormFields}
                </div>

                <div className="hidden md:grid md:grid-cols-3 gap-16">
                    <div />
                    {FormFields}
                    <SessionInfo session={session} />
                </div>
            </div>
        </div>
    );
}
