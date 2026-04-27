import { useState, useEffect } from 'react';
import MethodModal, { type MethodType } from '../../components/admin/modal/MethodModal';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

function MethodCard({ method, onEdit, onDeleted }: { method: MethodType; onEdit: () => void; onDeleted: () => void }) {
    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const res = await fetch(`${BASE}/api/methods/${method.id}`, { method: 'DELETE' });
            if (res.ok || res.status === 204) onDeleted();
        } finally {
            setDeleting(false);
            setConfirming(false);
        }
    };

    return (
        <div className="bg-wood-light border border-wood-accent/10 rounded-xl px-5 py-5 flex flex-col gap-3 group">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <p className="font-cormorant text-xl text-wood-dark leading-tight">{method.name}</p>
                    <p className="font-didot text-sm text-wood-accent mt-0.5">${Number(method.price).toFixed(2)}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                    <button
                        onClick={onEdit}
                        className="font-didot text-[10px] tracking-widest uppercase px-2.5 py-1.5 rounded-lg border border-wood-accent/20 text-wood-accent/60 hover:border-wood-accent/50 hover:text-wood-dark transition-colors duration-200"
                    >
                        Edit
                    </button>
                    {confirming ? (
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="font-didot text-[10px] tracking-widest uppercase px-2.5 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors duration-200 disabled:opacity-50"
                        >
                            {deleting ? '…' : 'Confirm'}
                        </button>
                    ) : (
                        <button
                            onClick={() => setConfirming(true)}
                            className="font-didot text-[10px] tracking-widest uppercase px-2.5 py-1.5 rounded-lg border border-wood-accent/20 text-wood-accent/40 hover:border-red-300 hover:text-red-400 transition-colors duration-200"
                        >
                            Delete
                        </button>
                    )}
                </div>
            </div>

            {method.description && (
                <p className="font-didot text-xs text-wood-accent/60 leading-relaxed">{method.description}</p>
            )}

            {confirming && (
                <p className="font-didot text-xs text-red-400">
                    This will remove the method. Sessions linked to it will become unlinked.{' '}
                    <button onClick={() => setConfirming(false)} className="underline underline-offset-2 text-wood-accent/50 hover:text-wood-dark transition-colors">Cancel</button>
                </p>
            )}
        </div>
    );
}

export default function Methods() {
    const [methods, setMethods] = useState<MethodType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editTarget, setEditTarget] = useState<MethodType | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    const fetchMethods = () => {
        setLoading(true);
        fetch(`${BASE}/api/methods`)
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(j => setMethods(j.results ?? []))
            .catch(() => setError('Failed to load methods.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchMethods(); }, []);

    return (
        <>
            <div className="flex flex-col flex-1 min-h-screen bg-wood-dark/5">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-wood-accent/10 bg-wood-light shrink-0">
                    <p className="font-didot text-xs text-wood-accent/40 tracking-widest">
                        {methods.length} {methods.length === 1 ? 'method' : 'methods'}
                    </p>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="whitespace-nowrap inline-flex items-center gap-2 font-didot text-[10px] tracking-[0.2em] uppercase bg-wood-accent text-white hover:bg-wood-dark shadow-sm hover:shadow-md transition-all duration-200 py-2.5 px-4 rounded-xl active:scale-95"
                    >
                        + New Method
                    </button>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading && <p className="font-didot text-xs text-wood-accent/40 tracking-widest">Loading…</p>}
                    {error && <p className="font-didot text-xs text-red-400 tracking-widest">{error}</p>}
                    {!loading && !error && methods.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-40 gap-3">
                            <p className="font-didot text-xs text-wood-accent/40 tracking-widest">No methods yet.</p>
                            <button
                                onClick={() => setShowCreate(true)}
                                className="font-didot text-xs tracking-widest uppercase border border-wood-accent/30 text-wood-accent hover:border-wood-accent hover:text-wood-dark px-4 py-2 rounded-lg transition-colors duration-200"
                            >
                                Create your first method
                            </button>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {methods.map(m => (
                            <MethodCard
                                key={m.id}
                                method={m}
                                onEdit={() => setEditTarget(m)}
                                onDeleted={fetchMethods}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {showCreate && (
                <MethodModal
                    onClose={() => setShowCreate(false)}
                    onSaved={() => { setShowCreate(false); fetchMethods(); }}
                />
            )}

            {editTarget && (
                <MethodModal
                    method={editTarget}
                    onClose={() => setEditTarget(null)}
                    onSaved={() => { setEditTarget(null); fetchMethods(); }}
                />
            )}
        </>
    );
}
