import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DayContent from './DayContent'
import type { SessionType } from '../../types/session'

function makeSession(overrides: Partial<SessionType> = {}): SessionType {
    return {
        id: 'abc',
        method_id: 'm1',
        method_name: 'Yoga',
        start_time: new Date('2099-01-01T09:00:00'), // far future so never "past"
        end_time: new Date('2099-01-01T10:00:00'),
        capacity: 10,
        spots_remaining: 5,
        instructor: 'Jane',
        created_at: '2024-01-01T00:00:00',
        ...overrides,
    }
}

describe('DayContent', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2024-01-15T12:00:00'))
    })
    afterEach(() => vi.useRealTimers())

    it('shows "No sessions" when flows list is empty', () => {
        render(<DayContent flows={[]} onSelect={vi.fn()} />)
        expect(screen.getByText('No sessions')).toBeInTheDocument()
    })

    it('renders a session card with method name', () => {
        render(<DayContent flows={[makeSession()]} onSelect={vi.fn()} />)
        expect(screen.getByText('Yoga')).toBeInTheDocument()
    })

    it('renders the instructor name', () => {
        render(<DayContent flows={[makeSession()]} onSelect={vi.fn()} />)
        expect(screen.getByText('Jane')).toBeInTheDocument()
    })

    it('shows spots remaining when not fully booked', () => {
        render(<DayContent flows={[makeSession({ spots_remaining: 3 })]} onSelect={vi.fn()} />)
        expect(screen.getByText('3 spots')).toBeInTheDocument()
    })

    it('shows "1 spot" (singular) when 1 spot remaining', () => {
        render(<DayContent flows={[makeSession({ spots_remaining: 1 })]} onSelect={vi.fn()} />)
        expect(screen.getByText('1 spot')).toBeInTheDocument()
    })

    it('shows "Fully Booked" when spots_remaining is 0', () => {
        render(<DayContent flows={[makeSession({ spots_remaining: 0 })]} onSelect={vi.fn()} />)
        expect(screen.getByText('Fully Booked')).toBeInTheDocument()
    })

    it('disables the button when fully booked', () => {
        render(<DayContent flows={[makeSession({ spots_remaining: 0 })]} onSelect={vi.fn()} />)
        expect(screen.getByRole('button')).toBeDisabled()
    })

    it('button is enabled when spots remain', () => {
        render(<DayContent flows={[makeSession({ spots_remaining: 2 })]} onSelect={vi.fn()} />)
        expect(screen.getByRole('button')).not.toBeDisabled()
    })

    it('calls onSelect with the session when clicked', () => {
        const onSelect = vi.fn()
        const session = makeSession()
        render(<DayContent flows={[session]} onSelect={onSelect} />)
        fireEvent.click(screen.getByRole('button'))
        expect(onSelect).toHaveBeenCalledWith(session)
    })

    it('groups morning sessions under "Morning"', () => {
        const morning = makeSession({ start_time: new Date('2099-01-01T08:00:00'), end_time: new Date('2099-01-01T09:00:00') })
        render(<DayContent flows={[morning]} onSelect={vi.fn()} />)
        expect(screen.getByText('Morning')).toBeInTheDocument()
    })

    it('groups afternoon sessions under "Afternoon"', () => {
        const afternoon = makeSession({ start_time: new Date('2099-01-01T13:00:00'), end_time: new Date('2099-01-01T14:00:00') })
        render(<DayContent flows={[afternoon]} onSelect={vi.fn()} />)
        expect(screen.getByText('Afternoon')).toBeInTheDocument()
    })

    it('groups evening sessions under "Evening"', () => {
        const evening = makeSession({ start_time: new Date('2099-01-01T18:00:00'), end_time: new Date('2099-01-01T19:00:00') })
        render(<DayContent flows={[evening]} onSelect={vi.fn()} />)
        expect(screen.getByText('Evening')).toBeInTheDocument()
    })

    it('shows loading skeletons when loading=true', () => {
        const { container } = render(<DayContent flows={[]} onSelect={vi.fn()} loading={true} />)
        expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    })

    it('does not show "No sessions" while loading', () => {
        render(<DayContent flows={[]} onSelect={vi.fn()} loading={true} />)
        expect(screen.queryByText('No sessions')).not.toBeInTheDocument()
    })

    it('filters out past sessions in dark variant', () => {
        const past = makeSession({
            id: 'past',
            start_time: new Date('2020-01-01T09:00:00'),
            end_time: new Date('2020-01-01T10:00:00'),
        })
        render(<DayContent flows={[past]} onSelect={vi.fn()} variant="dark" />)
        expect(screen.queryByRole('button')).not.toBeInTheDocument()
        expect(screen.getByText('No sessions')).toBeInTheDocument()
    })

    it('shows past sessions in light variant', () => {
        const past = makeSession({
            id: 'past',
            method_name: 'Past Flow',
            start_time: new Date('2020-01-01T09:00:00'),
            end_time: new Date('2020-01-01T10:00:00'),
        })
        render(<DayContent flows={[past]} onSelect={vi.fn()} variant="light" />)
        expect(screen.getByText('Past Flow')).toBeInTheDocument()
    })

    it('renders fallback "Method" when method_name is null', () => {
        render(<DayContent flows={[makeSession({ method_name: null })]} onSelect={vi.fn()} />)
        expect(screen.getByText('Method')).toBeInTheDocument()
    })

    it('does not render instructor line when instructor is null', () => {
        render(<DayContent flows={[makeSession({ instructor: null })]} onSelect={vi.fn()} />)
        expect(screen.queryByText('Jane')).not.toBeInTheDocument()
    })

    it('sorts sessions by start_time ascending', () => {
        const late = makeSession({ id: '2', method_name: 'Late', start_time: new Date('2099-01-01T17:00:00'), end_time: new Date('2099-01-01T18:00:00') })
        const early = makeSession({ id: '1', method_name: 'Early', start_time: new Date('2099-01-01T07:00:00'), end_time: new Date('2099-01-01T08:00:00') })
        render(<DayContent flows={[late, early]} onSelect={vi.fn()} />)
        const buttons = screen.getAllByRole('button')
        expect(buttons[0].textContent).toContain('Early')
        expect(buttons[1].textContent).toContain('Late')
    })
})
