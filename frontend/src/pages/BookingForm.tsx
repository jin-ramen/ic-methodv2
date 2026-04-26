import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom'

import type { SessionType } from '../types/SessionType'
import { formatTime, formatDate } from '../utils/dateUtils'
import { useAuth } from '../utils/useAuth'

const inputClass = "w-full bg-transparent border-b border-wood-text/30 focus:border-wood-text outline-none font-didot text-wood-text text-sm md:text-base py-2 md:py-3 tracking-wide transition-colors duration-200 placeholder:text-wood-text/30";
const labelClass = "font-didot text-wood-text/60 text-xs md:text-sm tracking-widest uppercase";

function SessionInfo({ session }: { session: SessionType }) {
    return (
        <div className="rounded-xl bg-wood-dark/80 px-6 py-6 flex flex-col gap-3">
            <p className="font-didot text-wood-text/40 text-xs tracking-widest uppercase">Your Session</p>
            <h2 className="font-cormorant text-wood-text text-4xl leading-tight">
                {formatTime(session.start_time)}<br />
                <span className="text-wood-text/60 text-2xl">– {formatTime(session.end_time)}</span>
            </h2>
            <p className="font-didot text-wood-text/80 text-sm tracking-widest mt-1">{formatDate(session.start_time)}</p>
            {session.instructor && (
                <p className="font-didot text-wood-text/50 text-xs tracking-widest mt-2">with {session.instructor}</p>
            )}
            <p className="font-didot text-wood-text/30 text-xs tracking-widest mt-1">
                {session.capacity} spot{session.capacity !== 1 ? 's' : ''} available
            </p>
        </div>
    );
}

type UserInfo = { first_name: string; last_name: string; email: string; phone: string | null }

type Props = { onBooked: () => void }

export default function BookingForm({ onBooked }: Props) {
    useParams<{ sessionId: string }>();
    const { state } = useLocation();
    const navigate = useNavigate();
    const { isLoggedIn, token } = useAuth();
    const session: SessionType | undefined = state?.session;
    const backHref = `/booking${state?.back ? `?${state.back}` : ''}`;

    const [notes, setNotes] = useState('');
    const [user, setUser] = useState<UserInfo | null>(null);
    const [userLoading, setUserLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [leaving, setLeaving] = useState(false);

    useEffect(() => {
        if (!isLoggedIn || !token) return;
        setUserLoading(true);
        fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/me`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => setUser(data))
            .catch(() => {})
            .finally(() => setUserLoading(false));
    }, [isLoggedIn, token]);

    if (!session) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <p className="font-didot text-wood-text text-sm tracking-widest">Session not found.</p>
                    <button onClick={() => navigate(backHref)} className="font-didot text-wood-text/50 text-xs tracking-widest underline underline-offset-4 mt-4">
                        ← Back to schedule
                    </button>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setStatus('loading');
        try {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ session_id: session.id, notes: notes || undefined }),
            });
            if (res.status === 429) {
                setErrorMsg('Too many attempts. Please wait a moment and try again.');
                setStatus('error');
                return;
            }
            if (res.status === 409) {
                const body = await res.json().catch(() => ({}));
                setErrorMsg(body.detail ?? 'This session is no longer available.');
                setStatus('error');
                return;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            onBooked();
            setLeaving(true);
            setTimeout(() => setStatus('success'), 300);
        } catch (err) {
            setErrorMsg((err as Error).message);
            setStatus('error');
        }
    };

    if (status === 'success') {
        return (
            <div className="flex-1 flex items-center justify-center px-5">
                <div className="text-center">
                    <p className="font-cormorant text-wood-dark text-4xl mb-3">You're booked.</p>
                    <p className="font-didot text-wood-accent text-sm tracking-widest mb-8">
                        See you on {formatDate(session.start_time)}.
                    </p>
                    <button onClick={() => navigate('/')} className="font-didot text-wood-accent/60 text-xs tracking-widest underline underline-offset-4">
                        ← Back to home
                    </button>
                </div>
            </div>
        );
    }

    if (!isLoggedIn) {
        return (
            <div className="flex-1 flex items-center justify-center px-5">
                <div className={`rounded-xl bg-wood-accent/95 w-full max-w-sm px-8 py-10 text-center opacity-0 animate-fade-in`} style={{ animationDuration: '0.4s', animationFillMode: 'forwards' }}>
                    <SessionInfo session={session} />
                    <div className="mt-8 flex flex-col gap-4">
                        <p className="font-didot text-wood-text/60 text-xs tracking-widest">Sign in to book this session.</p>
                        <Link
                            to="/login"
                            state={{ next: `/booking/${session.id}`, session, back: state?.back }}
                            className="font-didot text-xs tracking-widest uppercase border border-wood-text/40 text-wood-text hover:bg-wood-text hover:text-wood-dark transition-all duration-200 py-3 px-6"
                        >
                            Sign in
                        </Link>
                        <Link
                            to="/register"
                            className="font-didot text-wood-text/40 text-xs tracking-widest underline underline-offset-4"
                        >
                            No account? Register
                        </Link>
                        <button type="button" onClick={() => navigate(backHref)} className="font-didot text-wood-text/30 text-xs tracking-widest mt-2">
                            ← Back to calendar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const FormFields = (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 md:gap-8">
            {userLoading ? (
                <p className="font-didot text-wood-text/40 text-xs tracking-widest">Loading your details…</p>
            ) : user ? (
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <p className={labelClass}>Booking as</p>
                        <p className="font-didot text-wood-text text-sm py-2 tracking-wide">
                            {user.first_name} {user.last_name}
                        </p>
                        <p className="font-didot text-wood-text/50 text-xs tracking-wide">
                            {user.email}{user.phone ? ` · ${user.phone}` : ''}
                        </p>
                    </div>
                </div>
            ) : null}

            <div className="flex flex-col gap-1">
                <label className={labelClass}>Notes <span className="opacity-40 normal-case">(optional)</span></label>
                <input
                    className={inputClass}
                    placeholder="Injuries or anything your instructor should know"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                />
            </div>

            {status === 'error' && <p className="font-didot text-red-400 text-xs tracking-widest">{errorMsg}</p>}

            <button
                type="submit"
                disabled={status === 'loading' || userLoading || !user}
                className="mt-2 font-didot text-xs md:text-sm tracking-widest uppercase border border-wood-text/40 text-wood-text hover:bg-wood-text hover:text-wood-dark transition-all duration-200 py-3 md:py-4 px-6 disabled:opacity-40"
            >
                {status === 'loading' ? 'Booking...' : 'Confirm Commitment'}
            </button>
            <button type="button" onClick={() => navigate(backHref)} className="font-didot text-wood-text/30 text-xs tracking-widest">
                ← Back to calendar
            </button>
        </form>
    );

    return (
        <div className="flex-1 flex flex-col items-center justify-center px-5">
            <div className={`rounded-xl bg-wood-accent/95 w-full md:max-w-5xl px-6 py-8 md:px-10 md:py-12 opacity-0 animate-fade-in ${leaving ? 'animate-fade-out' : ''}`} style={{ animationDuration: '0.4s', animationFillMode: 'forwards' }}>
                <div className="md:hidden flex flex-col gap-10">
                    <button type="button" onClick={() => navigate(backHref)} className="font-didot text-wood-text/40 text-xs tracking-widest text-left">
                        ← Back to calendar
                    </button>
                    <SessionInfo session={session} />
                    {FormFields}
                </div>

                <div className="hidden md:grid md:grid-cols-3 gap-16">
                    <div />
                    {FormFields}
                    <SessionInfo session={session} />
                </div>
            </div>
        </div>
    );
}
