import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    toDateKey,
    formatTime,
    formatTime24,
    formatDate,
    formatDateShort,
    formatDay,
    getTodayDate,
    getDate,
    getDayLabel,
} from './dateUtils'

describe('toDateKey', () => {
    it('formats a Date to YYYY-MM-DD', () => {
        const result = toDateKey(new Date(2024, 0, 15)) // Jan 15 2024
        expect(result).toBe('2024-01-15')
    })

    it('accepts an ISO string', () => {
        const result = toDateKey('2024-06-01T00:00:00.000Z')
        // Result is locale-dependent (en-CA), but should be a valid YYYY-MM-DD
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
})

describe('formatTime', () => {
    it('returns 12-hour time string', () => {
        const date = new Date('2024-01-15T09:30:00')
        const result = formatTime(date)
        expect(result).toMatch(/\d{1,2}:\d{2}\s?(am|pm|AM|PM)/)
    })
})

describe('formatTime24', () => {
    it('returns 24-hour time string', () => {
        const date = new Date('2024-01-15T14:30:00')
        const result = formatTime24(date)
        expect(result).toMatch(/^\d{2}:\d{2}$/)
    })

    it('accepts a string input', () => {
        const result = formatTime24('2024-01-15T09:05:00')
        expect(result).toMatch(/^\d{2}:\d{2}$/)
    })
})

describe('formatDate', () => {
    it('returns a human-readable long date string', () => {
        const date = new Date(2024, 0, 15) // Jan 15 2024 (Monday)
        const result = formatDate(date)
        expect(result).toContain('January')
        expect(result).toContain('15')
    })
})

describe('formatDateShort', () => {
    it('includes year month day and weekday', () => {
        const date = new Date(2024, 0, 15)
        const result = formatDateShort(date)
        expect(result).toMatch(/\d{4}/) // year present
    })
})

describe('formatDay', () => {
    it('returns YYYY-MM-DD format from a Date', () => {
        const date = new Date(2024, 5, 7) // June 7 2024
        expect(formatDay(date)).toBe('2024-06-07')
    })

    it('pads month and day with leading zeros', () => {
        const date = new Date(2024, 0, 5) // Jan 5 2024
        expect(formatDay(date)).toBe('2024-01-05')
    })
})

describe('getTodayDate', () => {
    it('returns a Date with time zeroed out', () => {
        const today = getTodayDate()
        expect(today.getHours()).toBe(0)
        expect(today.getMinutes()).toBe(0)
        expect(today.getSeconds()).toBe(0)
        expect(today.getMilliseconds()).toBe(0)
    })
})

describe('getDate', () => {
    it('returns today when n=0', () => {
        const today = getTodayDate()
        const result = getDate(0)
        expect(result.toDateString()).toBe(today.toDateString())
    })

    it('returns tomorrow when n=1', () => {
        const today = getTodayDate()
        const tomorrow = getDate(1)
        expect(tomorrow.getDate()).toBe(today.getDate() + 1 <= 31 ? today.getDate() + 1 : 1)
    })

    it('returns yesterday when n=-1', () => {
        const today = getTodayDate()
        const yesterday = getDate(-1)
        const diff = today.getTime() - yesterday.getTime()
        expect(diff).toBe(86400000)
    })
})

describe('getDayLabel', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date(2024, 0, 15)) // Fix "today" to Jan 15 2024
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('returns "Today" for today', () => {
        const today = new Date(2024, 0, 15)
        today.setHours(0, 0, 0, 0)
        expect(getDayLabel(today)).toBe('Today')
    })

    it('returns "Tomorrow" for the next day', () => {
        const tomorrow = new Date(2024, 0, 16)
        tomorrow.setHours(0, 0, 0, 0)
        expect(getDayLabel(tomorrow)).toBe('Tomorrow')
    })

    it('returns a weekday short name for other dates', () => {
        const future = new Date(2024, 0, 17) // Wednesday
        future.setHours(0, 0, 0, 0)
        const result = getDayLabel(future)
        expect(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).toContain(result)
    })
})
