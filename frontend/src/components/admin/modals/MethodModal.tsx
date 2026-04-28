import { useState } from 'react';
import AdminModal from './AdminModal';
import { Field, inputCls } from '../FormField';
import { extractError, BASE } from '../../../utils/apiUtils';

export type MethodType = { id: string; name: string; price: number; description: string | null };

type Props = {
    method?: MethodType;
    onClose: () => void;
    onSaved: () => void;
};

export default function MethodModal({ method, onClose, onSaved }: Props) {
    const isEdit = !!method;
    const [name, setName] = useState(method?.name ?? '');
    const [price, setPrice] = useState(method?.price?.toString() ?? '');
    const [description, setDescription] = useState(method?.description ?? '');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, handleClose: () => void) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            const url = isEdit ? `${BASE}/api/methods/${method.id}` : `${BASE}/api/methods`;
            const res = await fetch(url, {
                method: isEdit ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    price: parseFloat(price),
                    description: description.trim() || null,
                }),
            });
            if (!res.ok) throw new Error(extractError(await res.json().catch(() => null)));
            onSaved();
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
                    <p className="font-cormorant text-wood-text text-xl tracking-wide mb-6">
                        {isEdit ? 'Edit Method' : 'New Method'}
                    </p>
                    <form onSubmit={e => handleSubmit(e, handleClose)} className="flex flex-col gap-5">
                        <Field label="Name">
                            <input required type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Pilates Flow" className={inputCls} />
                        </Field>
                        <Field label="Price (AUD)">
                            <input required type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className={inputCls} />
                        </Field>
                        <Field label="Description">
                            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional — shown to clients" rows={3} className={inputCls + ' resize-none'} />
                        </Field>
                        {error && <p className="font-didot text-xs text-red-300 leading-relaxed">{error}</p>}
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={handleClose} className="flex-1 font-didot text-sm tracking-wide border border-wood-text/20 text-wood-text/60 hover:text-wood-text hover:border-wood-text/40 py-2.5 rounded-lg transition-colors duration-200">
                                Cancel
                            </button>
                            <button type="submit" disabled={submitting} className="flex-1 font-didot text-sm tracking-wide bg-wood-text/15 text-wood-text hover:bg-wood-text/25 py-2.5 rounded-lg transition-colors duration-200 disabled:opacity-40">
                                {submitting ? 'Saving…' : isEdit ? 'Save' : 'Create'}
                            </button>
                        </div>
                    </form>
                </>
            )}
        </AdminModal>
    );
}
