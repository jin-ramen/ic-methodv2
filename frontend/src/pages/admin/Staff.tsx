import { useState, useEffect, useCallback } from 'react';
import PromoteMemberModal from '../../components/admin/modal/PromoteMemberModal';
import { useAdminContext } from '../../layouts/AdminLayout';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

type StaffUser = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    role: string;
};

const ROLE_STYLES: Record<string, string> = {
    owner: 'bg-amber-100 text-amber-700',
    staff: 'bg-blue-100 text-blue-700',
};

function Initials({ name }: { name: string }) {
    const parts = name.trim().split(' ');
    const letters = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
    return (
        <div className="w-11 h-11 rounded-full bg-wood-accent/20 flex items-center justify-center shrink-0">
            <span className="font-cormorant text-lg text-wood-dark uppercase">{letters}</span>
        </div>
    );
}

function MemberCard({ user, onDemoted, isOwner, isSelf }: { user: StaffUser; onDemoted: () => void; isOwner: boolean; isSelf: boolean }) {
    const [demoting, setDemoting] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const token = localStorage.getItem('access_token') ?? '';
    const fullName = `${user.first_name} ${user.last_name}`;
    const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase();
    const roleStyle = ROLE_STYLES[user.role.toLowerCase()] ?? ROLE_STYLES.staff;
    const nextRole = user.role.toLowerCase() === 'owner' ? 'staff' : 'member';

    const handleDemote = async () => {
        setDemoting(true);
        try {
            const res = await fetch(`${BASE}/api/admin/users/${user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ role: nextRole }),
            });
            if (res.ok) onDemoted();
        } finally {
            setDemoting(false);
            setConfirming(false);
        }
    };

    return (
        <div className="bg-wood-light border border-wood-accent/10 rounded-xl px-5 py-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
                <Initials name={fullName} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-cormorant text-lg text-wood-dark leading-tight">{fullName}</p>
                        <span className={`font-didot text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded-full shrink-0 ${roleStyle}`}>
                            {roleLabel}
                        </span>
                    </div>
                    <p className="font-didot text-xs text-wood-accent/60 truncate">{user.email}</p>
                    {user.phone && <p className="font-didot text-xs text-wood-accent/40">{user.phone}</p>}
                </div>
                {isOwner && !isSelf && (
                    <div className="flex gap-1.5 shrink-0">
                        {confirming ? (
                            <button
                                onClick={handleDemote}
                                disabled={demoting}
                                className="font-didot text-[10px] tracking-widest uppercase px-2.5 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors duration-200 disabled:opacity-50"
                            >
                                {demoting ? '…' : 'Confirm'}
                            </button>
                        ) : (
                            <button
                                onClick={() => setConfirming(true)}
                                className="font-didot text-[10px] tracking-widest uppercase px-2.5 py-1.5 rounded-lg border border-wood-accent/20 text-wood-accent/40 hover:border-amber-300 hover:text-amber-500 transition-colors duration-200"
                            >
                                Demote
                            </button>
                        )}
                    </div>
                )}
            </div>
            {confirming && (
                <p className="font-didot text-xs text-amber-500">
                    This will demote them to {nextRole}.{' '}
                    <button onClick={() => setConfirming(false)} className="underline underline-offset-2 text-wood-accent/50 hover:text-wood-dark transition-colors">Cancel</button>
                </p>
            )}
        </div>
    );
}

function Section({ title, users, onDemoted, isOwner, currentUserId }: { title: string; users: StaffUser[]; onDemoted: () => void; isOwner: boolean; currentUserId: string }) {
    if (users.length === 0) return null;
    return (
        <div className="flex flex-col gap-3">
            <p className="font-didot text-[10px] tracking-widest uppercase text-wood-accent/40">{title}</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {users.map(u => (
                    <MemberCard key={u.id} user={u} onDemoted={onDemoted} isOwner={isOwner} isSelf={u.id === currentUserId} />
                ))}
            </div>
        </div>
    );
}

export default function Staff() {
    const { role, userId: currentUserId } = useAdminContext();
    const isOwner = role.toLowerCase() === 'owner';
    const [users, setUsers] = useState<StaffUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showPromote, setShowPromote] = useState(false);

    const fetchStaff = useCallback(() => {
        setLoading(true);
        fetch(`${BASE}/api/users`)
            .then(r => r.ok ? r.json() : Promise.reject())
            .then((data: StaffUser[]) => {
                setUsers(data.filter(u => ['owner', 'staff'].includes(u.role.toLowerCase())));
            })
            .catch(() => setError('Failed to load staff.'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchStaff(); }, [fetchStaff]);

    const owners = users.filter(u => u.role.toLowerCase() === 'owner');
    const staff = users.filter(u => u.role.toLowerCase() === 'staff');

    return (
        <>
            <div className="flex flex-col flex-1 min-h-screen bg-wood-dark/5">
                <div className="flex items-center justify-between px-6 py-4 border-b border-wood-accent/10 bg-wood-light shrink-0">
                    <p className="font-didot text-xs text-wood-accent/40 tracking-widest">
                        {users.length} {users.length === 1 ? 'member' : 'members'}
                    </p>
                    {isOwner && (
                        <button
                            onClick={() => setShowPromote(true)}
                            className="whitespace-nowrap inline-flex items-center gap-2 font-didot text-[10px] tracking-[0.2em] uppercase bg-wood-accent text-white hover:bg-wood-dark shadow-sm hover:shadow-md transition-all duration-200 py-2.5 px-4 rounded-xl active:scale-95"
                        >
                            + Promote a Member
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
                    {loading && <p className="font-didot text-xs text-wood-accent/40 tracking-widest">Loading…</p>}
                    {error && <p className="font-didot text-xs text-red-400 tracking-widest">{error}</p>}

                    {!loading && !error && users.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-40 gap-3">
                            <p className="font-didot text-xs text-wood-accent/40 tracking-widest">No staff yet.</p>
                            {isOwner && (
                                <button
                                    onClick={() => setShowPromote(true)}
                                    className="font-didot text-xs tracking-widest uppercase border border-wood-accent/30 text-wood-accent hover:border-wood-accent hover:text-wood-dark px-4 py-2 rounded-lg transition-colors duration-200"
                                >
                                    Promote first member
                                </button>
                            )}
                        </div>
                    )}

                    <Section title="Owners" users={owners} onDemoted={fetchStaff} isOwner={isOwner} currentUserId={currentUserId} />
                    <Section title="Staff" users={staff} onDemoted={fetchStaff} isOwner={isOwner} currentUserId={currentUserId} />
                </div>
            </div>

            {showPromote && (
                <PromoteMemberModal
                    onClose={() => setShowPromote(false)}
                    onPromoted={() => { setShowPromote(false); fetchStaff(); }}
                />
            )}
        </>
    );
}
