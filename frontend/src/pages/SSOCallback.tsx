import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react'

export default function SSOCallback() {
    return (
        <div className="flex-1 flex items-center justify-center">
            <p className="font-didot text-wood-text/40 text-xs tracking-widest animate-pulse">Signing you in…</p>
            <AuthenticateWithRedirectCallback />
        </div>
    )
}
