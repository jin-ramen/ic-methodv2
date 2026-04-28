import { useState, useEffect, useRef } from 'react';
import { BASE } from '../../../utils/apiUtils';

type UserResult = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    role: string;
};

const inputClass = "w-full bg-transparent border-b border-wood-dark/20 focus:border-wood-dark outline-none font-didot text-wood-dark text-sm py-2 tracking-wide transition-colors duration-200 placeholder:text-wood-dark/25";
const labelClass = "font-didot text-wood-dark/50 text-[10px] tracking-widest uppercase";

type Props = {
    sessionId: string;
    onClose: () => void;
    onBooked: () => void;
};

export default function AddClientModal({ sessionId, onClose, onBooked }: Props) {
    const [tab, setTab] = useState<'user' | 'guest'>('user');
    const [closing, setClosing] = useState(false);

    const handleClose = () => setClosing(true);
    const handleAnimationEnd = () => { if (closing) onClose(); };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className={`absolute inset-0 bg-black/40 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
                onClick={handleClose}
            />
            <div
                className={`relative bg-wood-light w-full max-w-md mx-4 rounded-xl shadow-xl flex flex-col max-h-[85dvh] opacity-0 ${closing ? 'animate-modal-out' : 'animate-modal-in'}`}
                onAnimationEnd={handleAnimationEnd}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-wood-accent/10 shrink-0">
                    <p className="font-cormorant text-2xl text-wood-dark">Add Client</p>
                    <button onClick={handleClose} className="font-didot text-wood-accent/40 hover:text-wood-dark text-3xl leading-none transition-colors">×</button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-wood-accent/10 shrink-0">
                    {(['user', 'guest'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`flex-1 font-didot text-xs tracking-widest uppercase py-3 transition-colors duration-200 border-b-2 -mb-px ${tab === t ? 'border-wood-dark text-wood-dark' : 'border-transparent text-wood-accent/40 hover:text-wood-accent'}`}
                        >
                            {t === 'user' ? 'Registered User' : 'Guest'}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {tab === 'user'
                        ? <UserSearch sessionId={sessionId} onBooked={onBooked} onClose={handleClose} />
                        : <GuestForm sessionId={sessionId} onBooked={onBooked} onClose={handleClose} />
                    }
                </div>
            </div>
        </div>
    );
}

function UserSearch({ sessionId, onBooked, onClose }: { sessionId: string; onBooked: () => void; onClose: () => void }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<UserResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [submitting, setSubmitting] = useState<string | null>(null);
    const [error, setError] = useState('');
    const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (debounce.current) clearTimeout(debounce.current);
        if (!query.trim()) { setResults([]); return; }
        debounce.current = setTimeout(() => {
            setSearching(true);
            fetch(`${BASE}/api/users?search=${encodeURIComponent(query)}`)
                .then(r => r.ok ? r.json() : Promise.reject())
                .then(data => setResults(Array.isArray(data) ? data : []))
                .catch(() => setResults([]))
                .finally(() => setSearching(false));
        }, 300);
        return () => { if (debounce.current) clearTimeout(debounce.current); };
    }, [query]);

    const book = async (user: UserResult) => {
        setSubmitting(user.id);
        setError('');
        const token = localStorage.getItem('access_token') ?? '';
        try {
            const res = await fetch(`${BASE}/api/admin/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ session_id: sessionId, user_id: user.id }),
            });
            if (res.status === 409) { const b = await res.json(); setError(b.detail); return; }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            onBooked();
            onClose();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSubmitting(null);
        }
    };

    return (
        <div className="px-6 py-5 flex flex-col gap-4">
            <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-wood-accent/40 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                    autoFocus
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search by name or email…"
                    className="w-full pl-8 pr-3 py-2 font-didot text-sm text-wood-dark bg-wood-dark/5 border border-wood-accent/10 rounded-lg focus:outline-none focus:border-wood-accent/30 placeholder:text-wood-accent/30 transition-colors duration-200"
                />
            </div>

            {error && <p className="font-didot text-xs text-red-500">{error}</p>}

            {searching && <p className="font-didot text-xs text-wood-accent/40 tracking-widest">Searching…</p>}

            {!searching && query && results.length === 0 && (
                <p className="font-didot text-xs text-wood-accent/40 tracking-widest">No users found.</p>
            )}

            <div className="flex flex-col gap-2">
                {results.map(u => (
                    <button
                        key={u.id}
                        onClick={() => book(u)}
                        disabled={submitting === u.id}
                        className="flex items-center gap-3 text-left border border-wood-accent/10 rounded-lg px-4 py-3 hover:border-wood-accent/30 hover:bg-wood-accent/5 transition-all duration-200 disabled:opacity-50 group"
                    >
                        <div className="w-9 h-9 rounded-full bg-wood-accent/20 flex items-center justify-center shrink-0">
                            <span className="font-cormorant text-base text-wood-dark uppercase">
                                {u.first_name[0]}{u.last_name[0]}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-cormorant text-base text-wood-dark truncate">{u.first_name} {u.last_name}</p>
                            <p className="font-didot text-xs text-wood-accent/50 truncate">{u.email}</p>
                        </div>
                        <span className="font-didot text-[10px] tracking-widest text-wood-accent/40 group-hover:text-wood-accent shrink-0 transition-colors">
                            {submitting === u.id ? '…' : '+ Add'}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}

function GuestForm({ sessionId, onBooked, onClose }: { sessionId: string; onBooked: () => void; onClose: () => void }) {
    const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', notes: '' });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const set = (f: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(v => ({ ...v, [f]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        const token = localStorage.getItem('access_token') ?? '';
        try {
            const res = await fetch(`${BASE}/api/admin/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    session_id: sessionId,
                    first_name: form.first_name,
                    last_name: form.last_name,
                    email: form.email || undefined,
                    phone: form.phone || undefined,
                    notes: form.notes || undefined,
                }),
            });
            if (res.status === 409) { const b = await res.json(); setError(b.detail); return; }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            onBooked();
            onClose();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                    <label className={labelClass}>First name</label>
                    <input required className={inputClass} placeholder="Jane" value={form.first_name} onChange={set('first_name')} />
                </div>
                <div className="flex flex-col gap-1">
                    <label className={labelClass}>Last name</label>
                    <input required className={inputClass} placeholder="Doe" value={form.last_name} onChange={set('last_name')} />
                </div>
            </div>
            <div className="flex flex-col gap-1">
                <label className={labelClass}>Email <span className="opacity-40 normal-case">(optional)</span></label>
                <input type="email" className={inputClass} placeholder="jane@example.com" value={form.email} onChange={set('email')} />
            </div>
            <div className="flex flex-col gap-1">
                <label className={labelClass}>Phone <span className="opacity-40 normal-case">(optional)</span></label>
                <input className={inputClass} placeholder="+61 4xx xxx xxx" value={form.phone} onChange={set('phone')} />
            </div>
            <div className="flex flex-col gap-1">
                <label className={labelClass}>Notes <span className="opacity-40 normal-case">(optional)</span></label>
                <input className={inputClass} placeholder="Injuries or anything the instructor should know" value={form.notes} onChange={set('notes')} />
            </div>

            {error && <p className="font-didot text-xs text-red-500">{error}</p>}

            <button
                type="submit"
                disabled={submitting}
                className="font-didot text-xs tracking-widest uppercase border border-wood-dark/30 text-wood-dark hover:bg-wood-dark hover:text-white transition-all duration-200 py-3 disabled:opacity-40"
            >
                {submitting ? 'Adding…' : 'Add Guest'}
            </button>
        </form>
    );
}
