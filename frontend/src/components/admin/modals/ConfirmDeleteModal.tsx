import { useState } from 'react';
import AdminModal from './AdminModal';
import { BASE } from '../../../utils/apiUtils';

type Props = {
    title: string;
    description: React.ReactNode;
    confirmText: string;
    endpoint: string;
    deleteLabel: string;
    deletingLabel: string;
    onClose: () => void;
    onDeleted: () => void;
};

export default function ConfirmDeleteModal({ title, description, confirmText, endpoint, deleteLabel, deletingLabel, onClose, onDeleted }: Props) {
    const [input, setInput] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const matches = input.trim() === confirmText;

    const handleDelete = async (handleClose: () => void) => {
        if (!matches) return;
        setError(null);
        setSubmitting(true);
        try {
            const res = await fetch(`${BASE}${endpoint}`, { method: 'DELETE' });
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
        <AdminModal onClose={onClose}>
            {handleClose => (
                <>
                    <p className="font-cormorant text-wood-text text-xl tracking-wide mb-2">{title}</p>
                    <p className="font-didot text-xs text-wood-text/50 mb-6 leading-relaxed">{description}</p>
                    <div className="flex flex-col gap-4">
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder={confirmText}
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
                                onClick={() => handleDelete(handleClose)}
                                disabled={!matches || submitting}
                                className="flex-1 font-didot text-sm tracking-wide bg-red-500/80 text-white hover:bg-red-600 py-2.5 rounded-lg transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                {submitting ? deletingLabel : deleteLabel}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </AdminModal>
    );
}
