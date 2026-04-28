import { useState, useEffect, useRef } from 'react';
import { BASE } from '../../../utils/apiUtils';

type Member = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    role: string;
};

type Props = {
    onClose: () => void;
    onPromoted: () => void;
};

export default function PromoteMemberModal({ onClose, onPromoted }: Props) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Member[]>([]);
    const [searching, setSearching] = useState(false);
    const [promoting, setPromoting] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [closing, setClosing] = useState(false);
    const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
    const token = localStorage.getItem('access_token') ?? '';

    useEffect(() => {
        if (debounce.current) clearTimeout(debounce.current);
        setSearching(true);
        debounce.current = setTimeout(() => {
            const params = new URLSearchParams({ role: 'member' });
            if (query.trim()) params.set('search', query.trim());
            fetch(`${BASE}/api/users?${params}`)
                .then(r => r.ok ? r.json() : Promise.reject())
                .then(data => setResults(Array.isArray(data) ? data : []))
                .catch(() => setResults([]))
                .finally(() => setSearching(false));
        }, 300);
        return () => { if (debounce.current) clearTimeout(debounce.current); };
    }, [query]);

    const promote = async (member: Member) => {
        setPromoting(member.id);
        setError('');
        try {
            const res = await fetch(`${BASE}/api/admin/users/${member.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ role: 'staff' }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            onPromoted();
            setClosing(true);
        } catch {
            setError('Failed to promote member.');
        } finally {
            setPromoting(null);
        }
    };

    const handleClose = () => setClosing(true);
    const handleAnimationEnd = () => { if (closing) onClose(); };

    return (
        <div className="lg:bg-black/40 fixed inset-0 z-50 flex items-center justify-center">
            <div
                className={`absolute inset-0 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
                onClick={handleClose}
            />
            <div
                className={`modal relative bg-wood-dark p-8 w-full max-w-md mx-4 opacity-0 flex flex-col max-h-[80dvh] ${closing ? 'animate-modal-out' : 'animate-modal-in'}`}
                onAnimationEnd={handleAnimationEnd}
            >
                <div className="flex items-center justify-between mb-2 shrink-0">
                    <p className="font-cormorant text-wood-text text-xl tracking-wide">Promote a Member</p>
                    <button onClick={handleClose} className="font-didot text-wood-text/40 hover:text-wood-text text-3xl leading-none transition-colors">×</button>
                </div>
                <p className="font-didot text-wood-text/40 text-xs tracking-widest mb-5 shrink-0">
                    Search for a client and promote them to staff.
                </p>

                <div className="relative mb-4 shrink-0">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-wood-text/30 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input
                        autoFocus
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search by name or email…"
                        className="w-full pl-8 pr-3 py-2 font-didot text-sm text-wood-text bg-wood-text/10 border border-wood-text/20 rounded-lg focus:outline-none focus:border-wood-text/40 placeholder:text-wood-text/25 transition-colors duration-200"
                    />
                </div>

                {error && <p className="font-didot text-xs text-red-300 mb-3 shrink-0">{error}</p>}

                <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-2">
                    {searching && (
                        <p className="font-didot text-xs text-wood-text/30 tracking-widest">Searching…</p>
                    )}
                    {!searching && results.length === 0 && (
                        <p className="font-didot text-xs text-wood-text/30 tracking-widest">No members found.</p>
                    )}
                    {results.map(m => (
                        <button
                            key={m.id}
                            onClick={() => promote(m)}
                            disabled={promoting === m.id}
                            className="flex items-center gap-3 text-left border border-wood-text/10 rounded-lg px-4 py-3 hover:border-wood-text/30 hover:bg-wood-text/5 transition-all duration-200 disabled:opacity-50 group"
                        >
                            <div className="w-9 h-9 rounded-full bg-wood-text/10 flex items-center justify-center shrink-0">
                                <span className="font-cormorant text-base text-wood-text uppercase">
                                    {m.first_name[0]}{m.last_name[0]}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-cormorant text-base text-wood-text truncate">{m.first_name} {m.last_name}</p>
                                <p className="font-didot text-xs text-wood-text/40 truncate">{m.email}</p>
                            </div>
                            <span className="font-didot text-[10px] tracking-widest text-wood-text/30 group-hover:text-wood-text/60 shrink-0 transition-colors">
                                {promoting === m.id ? '…' : 'Promote →'}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
