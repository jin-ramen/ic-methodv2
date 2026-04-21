import { useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import type { FlowType } from '../types/flow'

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatFullDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-AU', { weekday: 'long', month: 'long', day: 'numeric' });
}

const inputClass = "w-full bg-transparent border-b border-wood-text/30 focus:border-wood-text outline-none font-didot text-wood-text text-sm md:text-base py-2 md:py-3 tracking-wide transition-colors duration-200 placeholder:text-wood-text/30";
const labelClass = "font-didot text-wood-text/60 text-xs md:text-sm tracking-widest uppercase";

function FlowInfo({ flow }: { flow: FlowType }) {
    return (
        <div className="flow bg-wood-dark/80 px-6 py-6 flex flex-col gap-3 opacity-0 animate-text-intro" style={{ animationDelay: '0.1s' }}>
            <p className="font-didot text-wood-text/40 text-xs tracking-widest uppercase">Your Flow</p>
            <h2 className="font-cormorant text-wood-text text-4xl leading-tight">
                {formatTime(flow.start_time)}<br />
                <span className="text-wood-text/60 text-2xl">– {formatTime(flow.end_time)}</span>
            </h2>
            <p className="font-didot text-wood-text/80 text-sm tracking-widest mt-1">{formatFullDate(flow.start_time)}</p>
            {flow.instructor && (
                <p className="font-didot text-wood-text/50 text-xs tracking-widest mt-2">with {flow.instructor}</p>
            )}
            <p className="font-didot text-wood-text/30 text-xs tracking-widest mt-1">
                {flow.capacity} spot{flow.capacity !== 1 ? 's' : ''} available
            </p>
        </div>
    );
}

export default function BookingForm() {
    useParams<{ flowId: string }>();
    const { state } = useLocation();
    const navigate = useNavigate();
    const flow: FlowType | undefined = state?.flow;

    const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', notes: '' });
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [leaving, setLeaving] = useState(false);

    if (!flow) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <p className="font-didot text-wood-text text-sm tracking-widest">Flow not found.</p>
                    <button onClick={() => navigate('/booking')} className="font-didot text-wood-text/50 text-xs tracking-widest underline underline-offset-4 mt-4">
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
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/commitments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ flow_id: flow.id, ...form }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
                    <p className="font-cormorant text-wood-dark text-4xl mb-3">You're commited.</p>
                    <p className="font-didot text-wood-accent text-sm tracking-widest mb-8">
                        See you on {formatFullDate(flow.start_time)}.
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
            <button type="button" onClick={() => navigate('/booking')} className="font-didot text-wood-text/30 text-xs tracking-widest">
                ← Back to calender
            </button>
        </form>
    );

    return (
        <div className="flex-1 flex flex-col items-center justify-center px-5">
            <div className={`bg-wood-accent/95 w-full md:max-w-5xl px-6 py-8 md:px-10 md:py-12 opacity-0 animate-fade-in ${leaving ? 'animate-fade-out' : ''}`} style={{ animationDuration: '0.4s', animationFillMode: 'forwards' }}>
                {/* Mobile: back link, flow info, form */}
                <div className="md:hidden flex flex-col gap-10">
                    <button type="button" onClick={() => navigate('/booking')} className="font-didot text-wood-text/40 text-xs tracking-widest text-left">
                        ← Back to calender
                    </button>
                    <FlowInfo flow={flow} />
                    {FormFields}
                </div>

                {/* Desktop: spacer | form (center) | flow info (right) */}
                <div className="hidden md:grid md:grid-cols-3 gap-16">
                    <div />
                    {FormFields}
                    <FlowInfo flow={flow} />
                </div>
            </div>
        </div>
    );
}
