import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { usePost } from '../../hooks/usePost'

const inputClass = "w-full bg-transparent border-b border-wood-text/30 focus:border-wood-text outline-none font-didot text-wood-text text-sm md:text-base py-2 md:py-3 tracking-wide transition-colors duration-200 placeholder:text-wood-text/30";
const labelClass = "font-didot text-wood-text/60 text-xs md:text-sm tracking-widest uppercase";

type LoginResponse = { access_token: string; token_type: string }

export default function UserLogin() {
    const navigate = useNavigate();
    const { submit, loading } = usePost<LoginResponse>('/api/login');
    const [form, setForm] = useState({ identifier: '', password: '' });
    const [errorMsg, setErrorMsg] = useState('');


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
        navigate('/');
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
                        <input
                            required
                            type="password"
                            autoComplete="current-password"
                            className={inputClass}
                            placeholder="••••••••"
                            value={form.password}
                            onChange={set('password')}
                        />
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
