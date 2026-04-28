import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useSignUp } from '@clerk/clerk-react'
import { isClerkAPIResponseError } from '@clerk/clerk-react/errors'
import PhoneInput from '../../components/PhoneInput'
import { usePost } from '../../hooks/usePost'
import { BASE } from '../../utils/apiUtils'

const inputClass = "w-full bg-transparent border-b border-wood-text/30 focus:border-wood-text outline-none font-didot text-wood-text text-sm md:text-base px-2 py-2 md:py-3 tracking-wide transition-colors duration-200 placeholder:text-wood-text/30";
const labelClass = "font-didot text-wood-text/60 text-xs md:text-sm tracking-widest uppercase";

type Step = 'form' | 'verify'

export default function UserRegistration() {
    const navigate = useNavigate();
    const { isLoaded, signUp, setActive } = useSignUp();
    const { submit } = usePost('/api/users');

    const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '', confirm: '' });
    const [step, setStep] = useState<Step>('form');
    const [otp, setOtp] = useState('');
    const [pending, setPending] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [resendCooldown]);

    const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(f => ({ ...f, [field]: e.target.value }));

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded) return;
        if (form.password !== form.confirm) {
            setErrorMsg('Passwords do not match.');
            return;
        }
        setErrorMsg('');
        setPending(true);
        try {
            const params = new URLSearchParams({ email: form.email });
            if (form.phone) params.set('phone', form.phone);
            const checkRes = await fetch(`${BASE}/api/users/check?${params}`);
            if (checkRes.ok) {
                const { email_taken, phone_taken } = await checkRes.json();
                if (email_taken) {
                    setErrorMsg('This email is already registered.');
                    setPending(false);
                    return;
                }
                if (phone_taken) {
                    setErrorMsg('This phone number is already registered.');
                    setPending(false);
                    return;
                }
            }
            await signUp.create({
                emailAddress: form.email,
                password: form.password,
                firstName: form.first_name,
                lastName: form.last_name,
            });
            await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
            setStep('verify');
            setResendCooldown(30);
        } catch (err: unknown) {
            setErrorMsg(isClerkAPIResponseError(err)
                ? (err.errors[0]?.longMessage ?? err.errors[0]?.message ?? 'Failed to send verification email.')
                : 'Failed to send verification email.');
        } finally {
            setPending(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded) return;
        setErrorMsg('');
        setPending(true);
        try {
            const emailVerified = signUp.verifications.emailAddress.status === 'verified';
            if (!emailVerified) {
                await signUp.attemptEmailAddressVerification({ code: otp });
            }
            const { confirm, phone, ...rest } = form;
            void confirm;
            const apiResult = await submit({ id: crypto.randomUUID(), ...rest, phone: phone || null });
            if (!apiResult.ok) {
                setErrorMsg(apiResult.detail);
                return;
            }
            if (signUp.createdSessionId) {
                await setActive({ session: signUp.createdSessionId });
            }
            const loginRes = await fetch(`${BASE}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: form.email, password: form.password }),
            });
            if (loginRes.ok) {
                const { access_token } = await loginRes.json();
                localStorage.setItem('access_token', access_token);
            }
            navigate('/welcome');
        } catch (err: unknown) {
            setErrorMsg(isClerkAPIResponseError(err)
                ? (err.errors[0]?.longMessage ?? err.errors[0]?.message ?? 'Invalid verification code.')
                : 'Invalid verification code.');
        } finally {
            setPending(false);
        }
    };

    const resendCode = async () => {
        if (!isLoaded || pending || resendCooldown > 0) return;
        setErrorMsg('');
        setPending(true);
        try {
            await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
            setResendCooldown(30);
        } catch (err: unknown) {
            setErrorMsg(isClerkAPIResponseError(err)
                ? (err.errors[0]?.message ?? 'Failed to resend code.')
                : 'Failed to resend code.');
        } finally {
            setPending(false);
        }
    };

    if (step === 'verify') {
        return (
            <div className="flex-1 flex flex-col items-center justify-center px-5">
                <div className="rounded-xl bg-wood-accent/95 w-full max-w-sm px-8 py-10 md:px-10 md:py-14 opacity-0 animate-fade-in" style={{ animationDuration: '0.4s', animationFillMode: 'forwards' }}>
                    <p className="font-didot text-wood-text/40 text-xs tracking-widest uppercase mb-2">Email verification</p>
                    <h1 className="font-cormorant text-wood-text text-4xl leading-tight mb-4">Check your inbox</h1>
                    <p className="font-didot text-wood-text/50 text-sm tracking-wide mb-10">
                        We sent a 6-digit code to <span className="text-wood-text/80">{form.email}</span>
                    </p>

                    <form onSubmit={handleVerify} className="flex flex-col gap-7">
                        <div className="flex flex-col gap-1">
                            <label className={labelClass}>Verification code</label>
                            <input
                                required
                                inputMode="numeric"
                                maxLength={6}
                                className={`${inputClass} text-center tracking-[0.4em] text-xl`}
                                placeholder="000000"
                                value={otp}
                                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                            />
                        </div>

                        {errorMsg && (
                            <p className="font-didot text-red-400 text-xs tracking-widest">{errorMsg}</p>
                        )}

                        <button
                            type="submit"
                            disabled={pending || otp.length !== 6}
                            className="mt-2 font-didot text-xs md:text-sm tracking-widest uppercase border border-wood-text/40 text-wood-text hover:bg-wood-text hover:text-wood-dark transition-all duration-200 py-3 md:py-4 px-6 disabled:opacity-40"
                        >
                            {pending ? 'Verifying...' : 'Verify email'}
                        </button>

                        <div className="flex justify-between items-center">
                            <button
                                type="button"
                                onClick={() => { setStep('form'); setOtp(''); setErrorMsg(''); }}
                                className="font-didot text-wood-text/30 text-xs tracking-widest hover:text-wood-text/60 transition-colors"
                            >
                                ← Change email
                            </button>
                            <button
                                type="button"
                                onClick={resendCode}
                                disabled={pending || resendCooldown > 0}
                                className="font-didot text-wood-text/40 text-xs tracking-widest hover:text-wood-text/70 transition-colors disabled:opacity-40 disabled:hover:text-wood-text/40"
                            >
                                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-12">
            <div className="rounded-xl bg-wood-accent/95 w-full max-w-sm px-8 py-10 md:px-10 md:py-14 opacity-0 animate-fade-in" style={{ animationDuration: '0.4s', animationFillMode: 'forwards' }}>
                <p className="font-didot text-wood-text/40 text-xs tracking-widest uppercase mb-2">Create account</p>
                <h1 className="font-cormorant text-wood-text text-4xl leading-tight mb-10">Register</h1>

                <form onSubmit={handleFormSubmit} className="flex flex-col gap-7">
                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>First name</label>
                        <input required className={inputClass} placeholder="Jane" value={form.first_name} onChange={set('first_name')} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>Last name</label>
                        <input required className={inputClass} placeholder="Doe" value={form.last_name} onChange={set('last_name')} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>Email</label>
                        <input required type="email" autoComplete="email" className={inputClass} placeholder="jane@example.com" value={form.email} onChange={set('email')} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>Phone <span className="opacity-40 normal-case">(optional)</span></label>
                        <PhoneInput onChange={v => setForm(f => ({ ...f, phone: v }))} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>Password</label>
                        <div className="relative flex items-center">
                            <input required type={showPassword ? 'text' : 'password'} autoComplete="new-password" className={`${inputClass} pr-8`} placeholder="••••••••" value={form.password} onChange={set('password')} />
                            <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-0 text-wood-text/40 hover:text-wood-text/70 transition-colors">
                                {showPassword
                                    ? <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                                    : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                }
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>Confirm password</label>
                        <div className="relative flex items-center">
                            <input required type={showConfirm ? 'text' : 'password'} autoComplete="new-password" className={`${inputClass} pr-8`} placeholder="••••••••" value={form.confirm} onChange={set('confirm')} />
                            <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-0 text-wood-text/40 hover:text-wood-text/70 transition-colors">
                                {showConfirm
                                    ? <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                                    : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                }
                            </button>
                        </div>
                    </div>

                    {errorMsg && (
                        <p className="font-didot text-red-400 text-xs tracking-widest">{errorMsg}</p>
                    )}

                    <div id="clerk-captcha" />

                    <button
                        type="submit"
                        disabled={pending || !isLoaded}
                        className="mt-2 font-didot text-xs md:text-sm tracking-widest uppercase border border-wood-text/40 text-wood-text hover:bg-wood-text hover:text-wood-dark transition-all duration-200 py-3 md:py-4 px-6 disabled:opacity-40"
                    >
                        {pending ? 'Sending code...' : 'Continue'}
                    </button>

                    <p className="font-didot text-wood-text/40 text-xs tracking-widest text-center">
                        Already have an account?{' '}
                        <Link to="/login" className="text-wood-text/70 underline underline-offset-4 hover:text-wood-text transition-colors">
                            Sign in
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}