import { useState } from 'react';
import { extractError } from '../../../utils/apiUtils';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export type CreatedUser = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    role: string;
};

const inputCls = 'w-full font-didot text-sm text-wood-dark bg-wood-dark/5 border border-wood-accent/10 rounded-lg px-3 py-2.5 focus:outline-none focus:border-wood-accent/30 placeholder:text-wood-accent/30 transition-colors duration-200';
const labelCls = 'font-didot text-[10px] tracking-widest uppercase text-wood-accent/50';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className={labelCls}>{label}</label>
            {children}
        </div>
    );
}

type Props = {
    onClose: () => void;
    onCreated: (user: CreatedUser) => void;
};

export default function CreateClientModal({ onClose, onCreated }: Props) {
    const [closing, setClosing] = useState(false);
    const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '', confirm: '' });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const set = (f: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(v => ({ ...v, [f]: e.target.value }));

    const handleClose = () => setClosing(true);
    const handleAnimationEnd = () => { if (closing) onClose(); };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
        if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
        setError(null);
        setSubmitting(true);
        try {
            const res = await fetch(`${BASE}/api/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    first_name: form.first_name.trim(),
                    last_name: form.last_name.trim(),
                    email: form.email.trim(),
                    phone: form.phone.trim() || null,
                    password: form.password,
                }),
            });
            if (!res.ok) {
                const b = await res.json().catch(() => null);
                throw new Error(extractError(b));
            }
            const user: CreatedUser = await res.json();
            onCreated(user);
            handleClose();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className={`absolute inset-0 bg-black/40 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
                onClick={handleClose}
            />
            <div
                className={`relative bg-wood-light w-full max-w-md mx-4 rounded-xl shadow-xl flex flex-col max-h-[90dvh] overflow-y-auto opacity-0 ${closing ? 'animate-modal-out' : 'animate-modal-in'}`}
                onAnimationEnd={handleAnimationEnd}
            >
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-wood-accent/10 shrink-0">
                    <p className="font-cormorant text-2xl text-wood-dark">New Client</p>
                    <button onClick={handleClose} className="font-didot text-wood-accent/40 hover:text-wood-dark text-3xl leading-none transition-colors">×</button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-5">
                    <div className="flex gap-4">
                        <Field label="First name">
                            <input required type="text" className={inputCls} placeholder="Jane" value={form.first_name} onChange={set('first_name')} autoFocus />
                        </Field>
                        <Field label="Last name">
                            <input required type="text" className={inputCls} placeholder="Doe" value={form.last_name} onChange={set('last_name')} />
                        </Field>
                    </div>

                    <Field label="Email">
                        <input required type="email" className={inputCls} placeholder="jane@example.com" value={form.email} onChange={set('email')} autoComplete="off" />
                    </Field>

                    <Field label="Phone (optional)">
                        <input type="tel" className={inputCls} placeholder="+61 4xx xxx xxx" value={form.phone} onChange={set('phone')} />
                    </Field>

                    <Field label="Password">
                        <input required type="password" className={inputCls} placeholder="••••••••" value={form.password} onChange={set('password')} autoComplete="new-password" />
                    </Field>

                    <Field label="Confirm password">
                        <input required type="password" className={inputCls} placeholder="••••••••" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
                    </Field>

                    {error && <p className="font-didot text-xs text-red-500">{error}</p>}

                    <div className="flex gap-3 pt-1 pb-1">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 font-didot text-xs tracking-widest uppercase border border-wood-accent/20 text-wood-accent/60 hover:text-wood-dark hover:border-wood-accent/40 py-2.5 rounded-lg transition-colors duration-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 font-didot text-xs tracking-widest uppercase bg-wood-accent text-white hover:bg-wood-dark py-2.5 rounded-lg transition-colors duration-200 disabled:opacity-40"
                        >
                            {submitting ? 'Creating…' : 'Create Client'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
