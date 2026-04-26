import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

type UserProfile = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    role: string;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <label className="font-didot text-[10px] tracking-widest uppercase text-wood-text/50">{label}</label>
            {children}
        </div>
    );
}

const inputCls = 'w-full bg-transparent border-b border-wood-text/30 focus:border-wood-text outline-none font-didot text-wood-text text-sm py-2 tracking-wide transition-colors duration-200 placeholder:text-wood-text/25';

export default function Profile() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const token = localStorage.getItem('access_token') ?? '';
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileError, setProfileError] = useState('');
    const [profileSuccess, setProfileSuccess] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    useEffect(() => {
        fetch(`${BASE}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then((u: UserProfile) => {
                setProfile(u);
                setFirstName(u.first_name);
                setLastName(u.last_name);
                setEmail(u.email);
                setPhone(u.phone ?? '');
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [token]);

    const handleProfileSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setProfileError('');
        setProfileSuccess(false);
        setProfileSaving(true);
        try {
            const res = await fetch(`${BASE}/api/me`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    first_name: firstName || null,
                    last_name: lastName || null,
                    email: email || null,
                    phone: phone || null,
                }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => null);
                throw new Error(body?.detail ?? 'Failed to save.');
            }
            const updated: UserProfile = await res.json();
            setProfile(updated);
            setProfileSuccess(true);
        } catch (err) {
            setProfileError((err as Error).message);
        } finally {
            setProfileSaving(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess(false);
        if (newPassword !== confirmPassword) { setPasswordError('New passwords do not match.'); return; }
        if (newPassword.length < 8) { setPasswordError('New password must be at least 8 characters.'); return; }
        setPasswordSaving(true);
        try {
            const res = await fetch(`${BASE}/api/me/password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => null);
                throw new Error(body?.detail ?? 'Failed to change password.');
            }
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setPasswordSuccess(true);
        } catch (err) {
            setPasswordError((err as Error).message);
        } finally {
            setPasswordSaving(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        navigate('/login');
    };

    if (loading) {
        return <div className="flex-1 flex items-center justify-center"><p className="font-didot text-xs text-wood-accent/40 tracking-widest">Loading…</p></div>;
    }

    if (!profile) {
        return <div className="flex-1 flex items-center justify-center"><p className="font-didot text-xs text-red-400 tracking-widest">Failed to load profile.</p></div>;
    }

    const initials = `${profile.first_name[0] ?? ''}${profile.last_name[0] ?? ''}`.toUpperCase();
    const roleLabel = profile.role.charAt(0).toUpperCase() + profile.role.slice(1).toLowerCase();

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="max-w-lg mx-auto px-6 flex flex-col gap-4">

                {pathname === '/account/profile' && (
                    <Link
                        to="/account"
                        className="flex items-center gap-1.5 font-didot text-[10px] tracking-widest uppercase text-wood-accent/50 hover:text-wood-accent transition-colors duration-200"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Dashboard
                    </Link>
                )}

                {/* Avatar + name */}
                <div className="flex items-center gap-4 px-0 py-3">
                    <div className="w-14 h-14 rounded-full bg-wood-accent/20 flex items-center justify-center shrink-0">
                        <span className="font-cormorant text-2xl text-wood-dark">{initials}</span>
                    </div>
                    <div>
                        <p className="font-cormorant text-2xl text-wood-accent leading-tight">{profile.first_name} {profile.last_name}</p>
                        <p className="font-didot text-[10px] tracking-widest uppercase text-wood-accent/50 mt-0.5">{roleLabel}</p>
                    </div>
                </div>

                {/* Profile form */}
                <div className="bg-wood-accent border border-wood-text/20 rounded-xl px-5 py-5">
                    <form onSubmit={handleProfileSave} className="flex flex-col gap-5">
                        <p className="font-didot text-[10px] tracking-widest uppercase text-wood-text/40">Profile</p>
                        <div className="flex gap-4">
                            <Field label="First Name">
                                <input className={inputCls} value={firstName} onChange={e => { setFirstName(e.target.value); setProfileSuccess(false); }} required />
                            </Field>
                            <Field label="Last Name">
                                <input className={inputCls} value={lastName} onChange={e => { setLastName(e.target.value); setProfileSuccess(false); }} required />
                            </Field>
                        </div>
                        <Field label="Email">
                            <input type="email" className={inputCls} value={email} onChange={e => { setEmail(e.target.value); setProfileSuccess(false); }} required />
                        </Field>
                        <Field label="Phone">
                            <input type="tel" className={inputCls} value={phone} onChange={e => { setPhone(e.target.value); setProfileSuccess(false); }} placeholder="Optional" />
                        </Field>
                        {profileError && <p className="font-didot text-xs text-red-400">{profileError}</p>}
                        {profileSuccess && <p className="font-didot text-xs text-green-400">Profile updated.</p>}
                        <button
                            type="submit"
                            disabled={profileSaving}
                            className="self-end font-didot text-xs tracking-widest uppercase border border-wood-accent/40 text-wood-accent hover:bg-wood-text hover:text-wood-dark py-2 px-5 rounded-lg transition-all duration-200 disabled:opacity-40"
                        >
                            {profileSaving ? 'Saving…' : 'Save Changes'}
                        </button>
                    </form>
                </div>

                {/* Password form */}
                <div className="bg-wood-accent border border-wood-text/20 rounded-xl px-5 py-5">
                    <form onSubmit={handlePasswordChange} className="flex flex-col gap-5">
                        <p className="font-didot text-[10px] tracking-widest uppercase text-wood-text/40">Change Password</p>
                        <Field label="Current Password">
                            <input type="password" className={inputCls} value={currentPassword} onChange={e => { setCurrentPassword(e.target.value); setPasswordSuccess(false); }} required autoComplete="current-password" />
                        </Field>
                        <Field label="New Password">
                            <input type="password" className={inputCls} value={newPassword} onChange={e => { setNewPassword(e.target.value); setPasswordSuccess(false); }} required autoComplete="new-password" />
                        </Field>
                        <Field label="Confirm New Password">
                            <input type="password" className={inputCls} value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setPasswordSuccess(false); }} required autoComplete="new-password" />
                        </Field>
                        {passwordError && <p className="font-didot text-xs text-red-400">{passwordError}</p>}
                        {passwordSuccess && <p className="font-didot text-xs text-green-400">Password changed.</p>}
                        <button
                            type="submit"
                            disabled={passwordSaving}
                            className="self-end font-didot text-xs tracking-widest uppercase border border-wood-accent/40 text-wood-accent hover:bg-wood-text hover:text-wood-dark py-2 px-5 rounded-lg transition-all duration-200 disabled:opacity-40"
                        >
                            {passwordSaving ? 'Saving…' : 'Update Password'}
                        </button>
                    </form>
                </div>

                {/* Sign out */}
                <div className="py-2 pb-8">
                    <button
                        onClick={handleLogout}
                        className="font-didot text-[10px] tracking-[0.2em] uppercase text-wood-accent/40 hover:text-red-400 transition-colors duration-200"
                    >
                        Sign Out
                    </button>
                </div>

            </div>
        </div>
    );
}
