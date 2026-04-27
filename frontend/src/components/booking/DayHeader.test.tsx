import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DayHeader from './DayHeader'

describe('DayHeader', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date(2024, 0, 15))
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('renders "Today" label for today', () => {
        const today = new Date(2024, 0, 15)
        today.setHours(0, 0, 0, 0)
        render(<DayHeader date={today} />)
        expect(screen.getByText('Today')).toBeInTheDocument()
    })

    it('renders "Tomorrow" label for the next day', () => {
        const tomorrow = new Date(2024, 0, 16)
        tomorrow.setHours(0, 0, 0, 0)
        render(<DayHeader date={tomorrow} />)
        expect(screen.getByText('Tomorrow')).toBeInTheDocument()
    })

    it('shows the formatted date (month and day)', () => {
        const date = new Date(2024, 0, 15)
        date.setHours(0, 0, 0, 0)
        render(<DayHeader date={date} />)
        expect(screen.getByText(/January/)).toBeInTheDocument()
    })

    it('renders the calendar icon button in dark variant', () => {
        const date = new Date(2024, 0, 15)
        date.setHours(0, 0, 0, 0)
        render(<DayHeader date={date} variant="dark" />)
        expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('calls onIconClick when button is clicked', () => {
        const onIconClick = vi.fn()
        const date = new Date(2024, 0, 15)
        date.setHours(0, 0, 0, 0)
        render(<DayHeader date={date} onIconClick={onIconClick} />)
        fireEvent.click(screen.getByRole('button'))
        expect(onIconClick).toHaveBeenCalledOnce()
    })

    it('applies animation class when variant=dark and animate=true', () => {
        const date = new Date(2024, 0, 15)
        date.setHours(0, 0, 0, 0)
        const { container } = render(<DayHeader date={date} variant="dark" animate={true} />)
        const wrapper = container.firstChild as HTMLElement
        expect(wrapper.className).toContain('animate-text-in')
    })

    it('does not apply animation class when animate=false', () => {
        const date = new Date(2024, 0, 15)
        date.setHours(0, 0, 0, 0)
        const { container } = render(<DayHeader date={date} variant="dark" animate={false} />)
        const wrapper = container.firstChild as HTMLElement
        expect(wrapper.className).not.toContain('animate-text-in')
    })

    it('does not apply animation class in light variant', () => {
        const date = new Date(2024, 0, 15)
        date.setHours(0, 0, 0, 0)
        const { container } = render(<DayHeader date={date} variant="light" />)
        const wrapper = container.firstChild as HTMLElement
        expect(wrapper.className).not.toContain('animate-text-in')
    })

    it('sets animationDelay style based on index prop', () => {
        const date = new Date(2024, 0, 15)
        date.setHours(0, 0, 0, 0)
        const { container } = render(<DayHeader date={date} index={3} />)
        const wrapper = container.firstChild as HTMLElement
        expect(wrapper.style.animationDelay).toBe('0.3s')
    })
})
