import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAuth } from './useAuth'

function makeToken(sub: string, expOffsetSeconds: number): string {
    const payload = { sub, exp: Math.floor(Date.now() / 1000) + expOffsetSeconds }
    const encoded = btoa(JSON.stringify(payload))
    return `header.${encoded}.signature`
}

describe('useAuth', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    afterEach(() => {
        localStorage.clear()
    })

    it('returns isLoggedIn=false when no token in localStorage', () => {
        const { result } = renderHook(() => useAuth())
        expect(result.current.isLoggedIn).toBe(false)
        expect(result.current.token).toBe(null)
        expect(result.current.userId).toBe(null)
    })

    it('returns isLoggedIn=true for a valid unexpired token', () => {
        const token = makeToken('user-123', 3600)
        localStorage.setItem('access_token', token)
        const { result } = renderHook(() => useAuth())
        expect(result.current.isLoggedIn).toBe(true)
        expect(result.current.token).toBe(token)
        expect(result.current.userId).toBe('user-123')
    })

    it('returns isLoggedIn=false for an expired token', () => {
        const token = makeToken('user-456', -10) // expired 10s ago
        localStorage.setItem('access_token', token)
        const { result } = renderHook(() => useAuth())
        expect(result.current.isLoggedIn).toBe(false)
        expect(result.current.token).toBe(null)
        expect(result.current.userId).toBe(null)
    })

    it('returns isLoggedIn=false for a malformed token', () => {
        localStorage.setItem('access_token', 'not.a.jwt')
        const { result } = renderHook(() => useAuth())
        expect(result.current.isLoggedIn).toBe(false)
    })

    it('returns isLoggedIn=false for a token with non-JSON payload', () => {
        localStorage.setItem('access_token', 'header.!!!invalid-base64!!!.sig')
        const { result } = renderHook(() => useAuth())
        expect(result.current.isLoggedIn).toBe(false)
    })

    it('exposes the correct userId from the token sub claim', () => {
        const token = makeToken('my-user-id', 7200)
        localStorage.setItem('access_token', token)
        const { result } = renderHook(() => useAuth())
        expect(result.current.userId).toBe('my-user-id')
    })

    it('does not expose token when expired', () => {
        const token = makeToken('user-789', -1)
        localStorage.setItem('access_token', token)
        const { result } = renderHook(() => useAuth())
        expect(result.current.token).toBeNull()
    })
})
