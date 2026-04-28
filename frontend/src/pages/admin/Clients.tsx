import { useState, useEffect, useMemo } from 'react';
import ClientModal from '../../components/admin/modals/ClientModal';
import CreateClientModal, { type CreatedUser } from '../../components/admin/modals/CreateClientModal';
import Initials from '../../components/admin/Initials';
import { getRoleStyle, toRoleLabel } from '../../utils/roleUtils';
import { BASE } from '../../utils/apiUtils';

type UserType = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    role: string;
};

function UserCard({ user, onClick }: { user: UserType; onClick: () => void }) {
    const fullName = `${user.first_name} ${user.last_name}`;
    const roleLabel = toRoleLabel(user.role);
    const roleStyle = getRoleStyle(user.role);

    return (
        <button
            onClick={onClick}
            className="flex items-center gap-4 w-full text-left bg-wood-light border border-wood-accent/10 rounded-xl px-4 py-4 hover:border-wood-accent/30 hover:shadow-md transition-all duration-200 group"
        >
            <Initials name={fullName} />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-cormorant text-lg text-wood-dark leading-tight truncate">{fullName}</p>
                    <span className={`font-didot text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded-full shrink-0 ${roleStyle}`}>
                        {roleLabel}
                    </span>
                </div>
                <p className="font-didot text-xs text-wood-accent/60 truncate mt-0.5">{user.email}</p>
                {user.phone && (
                    <p className="font-didot text-xs text-wood-accent/40 truncate">{user.phone}</p>
                )}
            </div>
            <svg className="w-4 h-4 text-wood-accent/20 group-hover:text-wood-accent/50 shrink-0 transition-colors duration-200" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 1l6 6-6 6" />
            </svg>
        </button>
    );
}

export default function Clients() {
    const [users, setUsers] = useState<UserType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<UserType | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    useEffect(() => {
        fetch(`${BASE}/api/users`)
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => setUsers(Array.isArray(data) ? data : []))
            .catch(() => setError('Failed to load clients.'))
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return users;
        return users.filter(u =>
            `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            (u.phone ?? '').includes(q)
        );
    }, [users, search]);

    return (
        <>
            <div className="flex flex-col flex-1 min-h-screen bg-wood-dark/5">
                {/* Toolbar */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-wood-accent/10 bg-wood-light shrink-0">
                    <div className="relative flex-1 max-w-sm">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-wood-accent/40 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                        </svg>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name or email…"
                            className="w-full pl-8 pr-3 py-2 font-didot text-xs tracking-wide text-wood-dark bg-wood-dark/5 border border-wood-accent/10 rounded-lg focus:outline-none focus:border-wood-accent/30 placeholder:text-wood-accent/30 transition-colors duration-200"
                        />
                    </div>
                    <p className="font-didot text-xs text-wood-accent/40 tracking-widest shrink-0">
                        {filtered.length} {filtered.length === 1 ? 'client' : 'clients'}
                    </p>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-1.5 font-didot text-xs tracking-widest uppercase bg-wood-accent text-white hover:bg-wood-dark px-3 py-2 rounded-lg transition-colors duration-200 shrink-0 ml-auto"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                        New Client
                    </button>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading && (
                        <p className="font-didot text-xs text-wood-accent/40 tracking-widest">Loading…</p>
                    )}
                    {error && (
                        <p className="font-didot text-xs text-red-400 tracking-widest">{error}</p>
                    )}
                    {!loading && !error && filtered.length === 0 && (
                        <p className="font-didot text-xs text-wood-accent/40 tracking-widest">No clients found.</p>
                    )}
                    <div className="grid md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-3">
                        {filtered.map(u => (
                            <UserCard key={u.id} user={u} onClick={() => setSelected(u)} />
                        ))}
                    </div>
                </div>
            </div>

            {selected && (
                <ClientModal user={selected} onClose={() => setSelected(null)} />
            )}

            {showCreate && (
                <CreateClientModal
                    onClose={() => setShowCreate(false)}
                    onCreated={(u: CreatedUser) => setUsers(prev => [u, ...prev])}
                />
            )}
        </>
    );
}
