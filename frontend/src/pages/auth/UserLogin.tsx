import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { usePost } from '../../hooks/usePost'

const inputClass = "w-full bg-transparent border-b border-wood-text/30 focus:border-wood-text outline-none font-didot text-wood-text text-sm md:text-base px-2 py-2 md:py-3 tracking-wide transition-colors duration-200 placeholder:text-wood-text/30";
const labelClass = "font-didot text-wood-text/60 text-xs md:text-sm tracking-widest uppercase";

type LoginResponse = { access_token: string; token_type: string }

export default function UserLogin() {
    const navigate = useNavigate();
    const { submit, loading } = usePost<LoginResponse>('/api/login');
    const [form, setForm] = useState({ identifier: '', password: '' });
    const [errorMsg, setErrorMsg] = useState('');
    const [showPassword, setShowPassword] = useState(false);


    const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(f => ({ ...f, [field]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        const result = await submit(form);
        if (!result.ok) {
            if (result.status === 404) setErrorMsg('No account found with that email.');
            else if (result.status === 401) setErrorMsg('Incorrect password.');
            else setErrorMsg(result.detail);
            return;
        }
        localStorage.setItem('access_token', result.data.access_token);
        navigate('/welcome');
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center px-5">
            <div className="rounded-xl bg-wood-accent/95 w-full max-w-sm px-8 py-10 md:px-10 md:py-14 opacity-0 animate-fade-in" style={{ animationDuration: '0.4s', animationFillMode: 'forwards' }}>
                <p className="font-didot text-wood-text/40 text-xs tracking-widest uppercase mb-2">Welcome back</p>
                <h1 className="font-cormorant text-wood-text text-4xl leading-tight mb-10">Sign in</h1>

                <form onSubmit={handleSubmit} className="flex flex-col gap-7">
                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>Email</label>
                        <input
                            required
                            type="email"
                            autoComplete="username"
                            className={inputClass}
                            placeholder="jane@example.com"
                            value={form.identifier}
                            onChange={set('identifier')}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>Password</label>
                        <div className="relative flex items-center">
                            <input
                                required
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                className={`${inputClass} pr-8`}
                                placeholder="••••••••"
                                value={form.password}
                                onChange={set('password')}
                            />
                            <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-0 text-wood-text/40 hover:text-wood-text/70 transition-colors">
                                {showPassword
                                    ? <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                                    : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                }
                            </button>
                        </div>
                    </div>

                    {errorMsg && (
                        <p className="font-didot text-red-400 text-xs tracking-widest">{errorMsg}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-2 font-didot text-xs md:text-sm tracking-widest uppercase border border-wood-text/40 text-wood-text hover:bg-wood-text hover:text-wood-dark transition-all duration-200 py-3 md:py-4 px-6 disabled:opacity-40"
                    >
                        {loading ? 'Signing in...' : 'Sign in'}
                    </button>

                    <p className="font-didot text-wood-text/40 text-xs tracking-widest text-center">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-wood-text/70 underline underline-offset-4 hover:text-wood-text transition-colors">
                            Register
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
