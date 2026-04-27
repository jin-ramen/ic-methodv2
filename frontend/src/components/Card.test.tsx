import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import Card from './Card'

const defaultProps = {
    img: 'https://example.com/photo.jpg',
    name: 'Jane Doe',
    role: 'Instructor',
    bio: 'A great instructor.',
    isHidden: false,
    onOpen: vi.fn(),
    onClose: vi.fn(),
}

describe('Card', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.clearAllMocks()
    })

    it('renders name and role', () => {
        render(<Card {...defaultProps} />)
        expect(screen.getByText('Jane Doe')).toBeInTheDocument()
        expect(screen.getByText('Instructor')).toBeInTheDocument()
    })

    it('renders the profile image with correct src', () => {
        render(<Card {...defaultProps} />)
        const img = screen.getAllByAltText('profile-picture')[0]
        expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg')
    })

    it('is visible when isHidden=false', () => {
        const { container } = render(<Card {...defaultProps} />)
        expect(container.firstChild).toHaveClass('opacity-100')
        expect(container.firstChild).not.toHaveClass('pointer-events-none')
    })

    it('is hidden when isHidden=true', () => {
        const { container } = render(<Card {...defaultProps} isHidden={true} />)
        expect(container.firstChild).toHaveClass('opacity-0', 'pointer-events-none')
    })

    it('calls onOpen when card is clicked', () => {
        const onOpen = vi.fn()
        render(<Card {...defaultProps} onOpen={onOpen} />)
        fireEvent.click(screen.getByAltText('profile-picture'))
        expect(onOpen).toHaveBeenCalledOnce()
    })

    it('modal is not shown before click', () => {
        render(<Card {...defaultProps} />)
        expect(screen.queryByText('A great instructor.')).not.toBeInTheDocument()
    })

    it('modal is shown after clicking the card', () => {
        render(<Card {...defaultProps} />)
        fireEvent.click(screen.getByAltText('profile-picture'))
        expect(screen.getByText('A great instructor.')).toBeInTheDocument()
    })

    it('modal shows name and bio after open', () => {
        render(<Card {...defaultProps} />)
        fireEvent.click(screen.getByAltText('profile-picture'))
        const names = screen.getAllByText('Jane Doe')
        expect(names.length).toBeGreaterThanOrEqual(1)
        expect(screen.getByText('A great instructor.')).toBeInTheDocument()
    })

    it('calls onClose after clicking to close and timer fires', async () => {
        const onClose = vi.fn()
        render(<Card {...defaultProps} onClose={onClose} />)

        // open
        fireEvent.click(screen.getByAltText('profile-picture'))

        // close by clicking the modal backdrop (modal div contains bio text)
        const bio = screen.getByText('A great instructor.')
        fireEvent.click(bio.closest('[class*="fixed"]')!)

        expect(onClose).not.toHaveBeenCalled()

        await act(async () => {
            vi.advanceTimersByTime(300)
        })

        expect(onClose).toHaveBeenCalledOnce()
    })

    it('modal disappears after close animation completes', async () => {
        render(<Card {...defaultProps} />)

        fireEvent.click(screen.getByAltText('profile-picture'))
        expect(screen.getByText('A great instructor.')).toBeInTheDocument()

        const bio = screen.getByText('A great instructor.')
        fireEvent.click(bio.closest('[class*="fixed"]')!)

        await act(async () => {
            vi.advanceTimersByTime(300)
        })

        expect(screen.queryByText('A great instructor.')).not.toBeInTheDocument()
    })
})
