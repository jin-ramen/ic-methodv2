import { useState } from 'react'
import { BASE } from '../../utils/apiUtils'

const inputClass = "w-full bg-transparent border-b border-wood-accent/30 focus:border-wood-accent outline-none font-didot text-wood-dark text-sm py-2 tracking-wide transition-colors duration-200 placeholder:text-wood-dark/30";
const labelClass = "font-didot text-wood-dark/50 text-xs tracking-widest uppercase";

type Props = { onSuccess: () => void; forbidden?: boolean }

export default function AdminLoginForm({ onSuccess, forbidden }: Props) {
    const [form, setForm] = useState({ identifier: '', password: '' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(f => ({ ...f, [field]: e.target.value }))

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const res = await fetch(`${BASE}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            if (res.status === 404) { setError('No account found with that email.'); return }
            if (res.status === 401) { setError('Incorrect password.'); return }
            if (!res.ok) { setError('Something went wrong.'); return }

            const { access_token } = await res.json()
            localStorage.setItem('access_token', access_token)
            onSuccess()
        } catch {
            setError('Could not reach the server.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-wood-light px-5">
            <div className="w-full max-w-sm">
                <p className="font-cormorant text-4xl text-wood-dark mb-1">IC Method</p>
                <p className="font-didot text-wood-dark/40 text-xs tracking-widest uppercase mb-10">Admin access</p>

                {forbidden && (
                    <p className="font-didot text-amber-600 text-xs tracking-widest mb-6">
                        Your account doesn't have admin access. Sign in with a staff or owner account.
                    </p>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-7">
                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>Email</label>
                        <input
                            required
                            type="email"
                            autoComplete="username"
                            className={inputClass}
                            placeholder="admin@example.com"
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

                    {error && <p className="font-didot text-red-500 text-xs tracking-widest">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-2 font-didot text-xs tracking-widest uppercase border border-wood-accent/40 text-wood-accent hover:bg-wood-accent hover:text-white transition-all duration-200 py-3 px-6 disabled:opacity-40"
                    >
                        {loading ? 'Signing in…' : 'Sign in'}
                    </button>
                </form>
            </div>
        </div>
    )
}
