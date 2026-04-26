import { useState } from 'react';
import { Field, inputCls } from '../FormField';
import { extractError } from '../../../utils/apiUtils';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export type StaffUser = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    role: string;
};

type Props = {
    user?: StaffUser;
    onClose: () => void;
    onSaved: () => void;
};

const ROLES = [
    { value: 'staff', label: 'Staff' },
    { value: 'owner', label: 'Owner' },
];

const selectCls = inputCls + ' cursor-pointer';

export default function StaffModal({ user, onClose, onSaved }: Props) {
    const isEdit = !!user;
    const token = localStorage.getItem('access_token') ?? '';

    const [firstName, setFirstName] = useState(user?.first_name ?? '');
    const [lastName, setLastName] = useState(user?.last_name ?? '');
    const [email, setEmail] = useState(user?.email ?? '');
    const [phone, setPhone] = useState(user?.phone ?? '');
    const [role, setRole] = useState(user?.role?.toLowerCase() ?? 'staff');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [closing, setClosing] = useState(false);

    const handleClose = () => setClosing(true);
    const handleAnimationEnd = () => { if (closing) onClose(); };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!isEdit && password !== confirm) {
            setError('Passwords do not match.');
            return;
        }
        setError(null);
        setSubmitting(true);
        try {
            const url = isEdit
                ? `${BASE}/api/admin/users/${user.id}`
                : `${BASE}/api/admin/users`;
            const body: Record<string, string | null> = {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                email: email.trim(),
                phone: phone.trim() || null,
                role,
            };
            if (!isEdit) body.password = password;

            const res = await fetch(url, {
                method: isEdit ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const b = await res.json().catch(() => null);
                throw new Error(extractError(b));
            }
            onSaved();
            handleClose();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="lg:bg-black/40 fixed inset-0 z-50 flex items-center justify-center">
            <div
                className={`absolute inset-0 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
                onClick={handleClose}
            />
            <div
                className={`modal relative bg-wood-dark p-8 w-full max-w-md mx-4 opacity-0 ${closing ? 'animate-modal-out' : 'animate-modal-in'}`}
                onAnimationEnd={handleAnimationEnd}
            >
                <p className="font-cormorant text-wood-text text-xl tracking-wide mb-6">
                    {isEdit ? 'Edit Member' : 'Add Staff Member'}
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="flex gap-4">
                        <Field label="First name" className="flex-1">
                            <input required type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" className={inputCls} />
                        </Field>
                        <Field label="Last name" className="flex-1">
                            <input required type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" className={inputCls} />
                        </Field>
                    </div>

                    <Field label="Email">
                        <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" className={inputCls} />
                    </Field>

                    <Field label="Phone">
                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+61 4xx xxx xxx" className={inputCls} />
                    </Field>

                    <Field label="Role">
                        <select value={role} onChange={e => setRole(e.target.value)} className={selectCls}>
                            {ROLES.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                        </select>
                    </Field>

                    {!isEdit && (
                        <>
                            <Field label="Password">
                                <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" className={inputCls} />
                            </Field>
                            <Field label="Confirm password">
                                <input required type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" autoComplete="new-password" className={inputCls} />
                            </Field>
                        </>
                    )}

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
            </div>
        </div>
    );
}
