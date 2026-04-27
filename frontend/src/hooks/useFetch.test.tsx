import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useFetch } from './useFetch'

describe('useFetch', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn())
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('starts in loading state', () => {
        vi.mocked(fetch).mockReturnValue(new Promise(() => {})) // never resolves
        const { result } = renderHook(() => useFetch('/api/test'))
        expect(result.current.loading).toBe(true)
        expect(result.current.data).toBe(null)
        expect(result.current.error).toBe(null)
    })

    it('sets data.results on successful fetch', async () => {
        const payload = { results: [{ id: 1 }] }
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => payload,
        } as Response)

        const { result } = renderHook(() => useFetch<{ id: number }[]>('/api/items'))

        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.data).toEqual([{ id: 1 }])
        expect(result.current.error).toBe(null)
    })

    it('sets error on non-ok response', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: false,
            status: 404,
            json: async () => ({}),
        } as Response)

        const { result } = renderHook(() => useFetch('/api/missing'))

        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.error).toBe('HTTP 404')
        expect(result.current.data).toBe(null)
    })

    it('sets error on network failure', async () => {
        vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

        const { result } = renderHook(() => useFetch('/api/broken'))

        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.error).toBe('Network error')
    })

    it('exposes a refetch function', () => {
        vi.mocked(fetch).mockReturnValue(new Promise(() => {}))
        const { result } = renderHook(() => useFetch('/api/test'))
        expect(typeof result.current.refetch).toBe('function')
    })

    it('re-fetches when refetch is called', async () => {
        vi.mocked(fetch)
            .mockResolvedValueOnce({ ok: true, json: async () => ({ results: ['first'] }) } as Response)
            .mockResolvedValueOnce({ ok: true, json: async () => ({ results: ['second'] }) } as Response)

        const { result } = renderHook(() => useFetch<string[]>('/api/test'))

        await waitFor(() => expect(result.current.data).toEqual(['first']))

        act(() => { result.current.refetch() })

        await waitFor(() => expect(result.current.data).toEqual(['second']))
        expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)
    })

    it('uses VITE_API_BASE_URL env var as base', async () => {
        vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => ({ results: [] }),
        } as Response)

        renderHook(() => useFetch('/endpoint'))

        await waitFor(() =>
            expect(vi.mocked(fetch)).toHaveBeenCalledWith(
                'https://api.example.com/endpoint',
                expect.objectContaining({ signal: expect.anything() })
            )
        )
        vi.unstubAllEnvs()
    })
})
