import { useMemo } from 'react'

type TokenPayload = { sub: string; exp: number }

function decodePayload(token: string): TokenPayload | null {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch {
        return null;
    }
}

export function useAuth() {
    const token = localStorage.getItem('access_token');
    const payload = useMemo(() => (token ? decodePayload(token) : null), [token]);
    const isLoggedIn = !!payload && payload.exp * 1000 > Date.now();

    return { token: isLoggedIn ? token : null, userId: isLoggedIn ? payload!.sub : null, isLoggedIn };
}
