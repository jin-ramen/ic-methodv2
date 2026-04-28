import { useState, useEffect, useCallback } from 'react'
import { BASE } from '../utils/apiUtils'

const ALLOWED_ROLES = ['owner', 'staff']

type AuthState =
    | { status: 'loading' }
    | { status: 'authorized'; name: string; role: string; userId: string }
    | { status: 'unauthorized' }
    | { status: 'forbidden' }

export function useAdminAuth() {
    const [state, setState] = useState<AuthState>({ status: 'loading' })
    const [tick, setTick] = useState(0)

    const refetch = useCallback(() => setTick(t => t + 1), [])

    useEffect(() => {
        setState({ status: 'loading' })
        const token = localStorage.getItem('access_token')
        if (!token) { setState({ status: 'unauthorized' }); return }

        fetch(`${BASE}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : Promise.reject(r.status))
            .then(user => {
                if (ALLOWED_ROLES.includes((user.role as string).toLowerCase())) {
                    setState({ status: 'authorized', name: `${user.first_name} ${user.last_name}`, role: user.role, userId: user.id })
                } else {
                    setState({ status: 'forbidden' })
                }
            })
            .catch(() => setState({ status: 'unauthorized' }))
    }, [tick])

    return { ...state, refetch }
}