import { useState } from 'react';
import type { SessionType } from '../../../types/session';

type Props = {
    session: SessionType;
    onClose: () => void;
    onDeleted: () => void;
};

export default function CancelSessionModal({ session: f, onClose, onDeleted }: Props) {
    const [input, setInput] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [closing, setClosing] = useState(false);

    const confirmName = f.method_name ?? 'this session';
    const matches = input.trim() === confirmName;

    const handleClose = () => setClosing(true);
    const handleAnimationEnd = () => { if (closing) onClose(); };

    const handleDelete = async () => {
        if (!matches) return;
        setError(null);
        setSubmitting(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/sessions/${f.id}`, {
                method: 'DELETE',
            });
            if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
            onDeleted();
            handleClose();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="lg:bg-black/40 fixed inset-0 z-50 flex items-center justify-center">
            <div className={`absolute inset-0 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`} onClick={handleClose} />
            <div
                className={`modal relative bg-wood-dark p-8 w-full max-w-md mx-4 opacity-0 ${closing ? 'animate-modal-out' : 'animate-modal-in'}`}
                onAnimationEnd={handleAnimationEnd}
            >
                <p className="font-cormorant text-wood-text text-xl tracking-wide mb-2">Cancel Flow</p>
                <p className="font-didot text-xs text-wood-text/50 mb-6 leading-relaxed">
                    This will permanently cancel the session and remove all bookings. Type <span className="text-wood-text/80 italic">{confirmName}</span> to confirm.
                </p>

                <div className="flex flex-col gap-4">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder={confirmName}
                        className="w-full font-didot text-sm text-wood-text bg-wood-text/10 border border-wood-text/20 focus:border-wood-text/50 focus:outline-none rounded-lg px-3 py-2 transition-colors duration-200 placeholder:text-wood-text/20"
                    />

                    {error && <p className="font-didot text-xs text-red-300">{error}</p>}

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 font-didot text-sm tracking-wide border border-wood-text/20 text-wood-text/60 hover:text-wood-text hover:border-wood-text/40 py-2.5 rounded-lg transition-colors duration-200"
                        >
                            Keep
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={!matches || submitting}
                            className="flex-1 font-didot text-sm tracking-wide bg-red-500/80 text-white hover:bg-red-600 py-2.5 rounded-lg transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Cancelling…' : 'Cancel Flow'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}