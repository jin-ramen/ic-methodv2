import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePost } from './usePost'

describe('usePost', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn())
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('starts with idle state', () => {
        const { result } = renderHook(() => usePost('/api/create'))
        expect(result.current.loading).toBe(false)
        expect(result.current.data).toBe(null)
        expect(result.current.error).toBe(null)
    })

    it('sets loading=true while submitting', async () => {
        let resolve!: (v: unknown) => void
        vi.mocked(fetch).mockReturnValue(new Promise(r => { resolve = r }))

        const { result } = renderHook(() => usePost('/api/create'))

        let submitPromise: Promise<unknown>
        act(() => { submitPromise = result.current.submit({ name: 'test' }) })

        expect(result.current.loading).toBe(true)

        // resolve to avoid dangling promise
        await act(async () => {
            resolve({ ok: true, json: async () => ({ id: 1 }) })
            await submitPromise
        })
    })

    it('returns ok:true and data on success', async () => {
        const responseData = { id: 42, name: 'created' }
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => responseData,
        } as Response)

        const { result } = renderHook(() => usePost<{ id: number; name: string }>('/api/create'))

        let outcome: unknown
        await act(async () => { outcome = await result.current.submit({ name: 'test' }) })

        expect(outcome).toEqual({ ok: true, data: responseData })
        expect(result.current.data).toEqual(responseData)
        expect(result.current.error).toBe(null)
        expect(result.current.loading).toBe(false)
    })

    it('returns ok:false with detail on HTTP error', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: false,
            status: 422,
            json: async () => ({ detail: 'Validation failed' }),
        } as Response)

        const { result } = renderHook(() => usePost('/api/create'))

        let outcome: unknown
        await act(async () => { outcome = await result.current.submit({}) })

        expect(outcome).toEqual({ ok: false, status: 422, detail: 'Validation failed' })
        expect(result.current.error).toBe('Validation failed')
        expect(result.current.loading).toBe(false)
    })

    it('falls back to HTTP status in detail when no body detail', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: false,
            status: 500,
            json: async () => ({}),
        } as Response)

        const { result } = renderHook(() => usePost('/api/create'))

        let outcome: unknown
        await act(async () => { outcome = await result.current.submit({}) })

        expect((outcome as { detail: string }).detail).toBe('HTTP 500')
    })

    it('returns ok:false on network failure', async () => {
        vi.mocked(fetch).mockRejectedValue(new Error('Failed to fetch'))

        const { result } = renderHook(() => usePost('/api/create'))

        let outcome: unknown
        await act(async () => { outcome = await result.current.submit({}) })

        expect(outcome).toMatchObject({ ok: false, status: 0, detail: 'Failed to fetch' })
        expect(result.current.error).toBe('Failed to fetch')
    })

    it('sends JSON body with correct headers', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => ({}),
        } as Response)

        const { result } = renderHook(() => usePost('/api/create'))
        await act(async () => { await result.current.submit({ foo: 'bar' }) })

        expect(vi.mocked(fetch)).toHaveBeenCalledWith(
            expect.stringContaining('/api/create'),
            expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ foo: 'bar' }),
            })
        )
    })

    it('clears previous error on new submit', async () => {
        // first call fails
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: false,
            status: 400,
            json: async () => ({ detail: 'Bad input' }),
        } as Response)
        // second call succeeds
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: 1 }),
        } as Response)

        const { result } = renderHook(() => usePost('/api/create'))

        await act(async () => { await result.current.submit({}) })
        expect(result.current.error).toBe('Bad input')

        await act(async () => { await result.current.submit({ valid: true }) })
        expect(result.current.error).toBe(null)
    })
})
