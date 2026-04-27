import { describe, it, expect } from 'vitest'
import { extractError } from './apiUtils'

describe('extractError', () => {
    it('returns fallback for null', () => {
        expect(extractError(null)).toBe('Something went wrong')
    })

    it('returns fallback for undefined', () => {
        expect(extractError(undefined)).toBe('Something went wrong')
    })

    it('returns fallback for a plain string', () => {
        expect(extractError('some error')).toBe('Something went wrong')
    })

    it('returns fallback for a number', () => {
        expect(extractError(42)).toBe('Something went wrong')
    })

    it('returns detail when it is a string', () => {
        expect(extractError({ detail: 'Not found' })).toBe('Not found')
    })

    it('returns fallback when detail is missing', () => {
        expect(extractError({ message: 'oops' })).toBe('Something went wrong')
    })

    it('joins array of error objects by msg field', () => {
        const body = {
            detail: [
                { msg: 'Field required', loc: ['body', 'name'] },
                { msg: 'Value error', loc: ['body', 'email'] },
            ],
        }
        expect(extractError(body)).toBe('Field required, Value error')
    })

    it('returns fallback for empty array detail', () => {
        expect(extractError({ detail: [] })).toBe('Something went wrong')
    })

    it('stringifies array entries that lack msg', () => {
        const body = { detail: [{ other: 'x' }] }
        const result = extractError(body)
        expect(typeof result).toBe('string')
        expect(result.length).toBeGreaterThan(0)
    })
})
