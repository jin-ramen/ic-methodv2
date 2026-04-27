import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import DayContent from './DayContent'
import type { SessionType } from '../../types/session'

function makeFullSession(): SessionType {
    return {
        id: 'full',
        method_id: 'm1',
        method_name: 'Flow',
        start_time: new Date('2099-01-01T09:00:00'),
        end_time: new Date('2099-01-01T10:00:00'),
        capacity: 10,
        spots_remaining: 0,
        instructor: 'Jane',
        created_at: '2024-01-01T00:00:00',
    }
}

describe('DayContent fully-booked label spelling', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2024-01-15T12:00:00'))
    })
    afterEach(() => vi.useRealTimers())

    it('displays "Fully Booked" (correctly spelled) when no spots remain', () => {
        render(<DayContent flows={[makeFullSession()]} onSelect={vi.fn()} />)
        expect(screen.getByText('Fully Booked')).toBeInTheDocument()
    })
})
