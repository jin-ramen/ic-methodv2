import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Header, Footer } from './Nav'

// useAuth reads localStorage; we isolate per test
vi.mock('../hooks/useAuth', () => ({
    useAuth: vi.fn(),
}))

import { useAuth } from '../hooks/useAuth'
const mockUseAuth = vi.mocked(useAuth)

function renderHeader(path = '/') {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <Header />
        </MemoryRouter>
    )
}

describe('Header', () => {
    beforeEach(() => {
        mockUseAuth.mockReturnValue({ isLoggedIn: false, token: null, userId: null })
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    it('renders the brand name "IC Method."', () => {
        renderHeader()
        expect(screen.getAllByText('IC Method.').length).toBeGreaterThan(0)
    })

    it('shows "Log in" link when not logged in', () => {
        renderHeader()
        const links = screen.getAllByRole('link')
        const loginLink = links.find(l => l.textContent?.includes('Log in'))
        expect(loginLink).toBeDefined()
    })

    it('shows "Dashboard" link when logged in', () => {
        mockUseAuth.mockReturnValue({ isLoggedIn: true, token: 'tok', userId: 'u1' })
        renderHeader()
        const links = screen.getAllByRole('link')
        const dashLink = links.find(l => l.textContent === 'Dashboard')
        expect(dashLink).toBeDefined()
    })

    it('renders desktop nav links for About, People, Studio', () => {
        renderHeader()
        const allLinks = screen.getAllByRole('link')
        const texts = allLinks.map(l => l.textContent)
        expect(texts).toContain('About')
        expect(texts).toContain('People')
        expect(texts).toContain('Studio')
    })

    it('has a mobile menu toggle button', () => {
        renderHeader()
        expect(screen.getByTestId ? true : true).toBe(true) // just check it renders
        const toggles = document.querySelectorAll('#toggleMenu')
        expect(toggles.length).toBe(1)
    })

    it('mobile menu is hidden off-screen initially', () => {
        const { container } = renderHeader()
        const mobileMenu = container.querySelector('.translate-x-full')
        expect(mobileMenu).not.toBeNull()
    })

    it('opens mobile menu when toggle is clicked', () => {
        const { container } = renderHeader()
        const toggle = container.querySelector('#toggleMenu')!
        fireEvent.click(toggle)
        expect(container.querySelector('.translate-x-0')).not.toBeNull()
    })

    it('closes mobile menu after clicking a mobile nav link', () => {
        const { container } = renderHeader()
        const toggle = container.querySelector('#toggleMenu')!
        fireEvent.click(toggle) // open

        const mobileLinks = container.querySelectorAll('.fixed a')
        fireEvent.click(mobileLinks[0]) // click first link
        expect(container.querySelector('.translate-x-full')).not.toBeNull()
    })

    it('mobile menu contains Book link', () => {
        const { container } = renderHeader()
        const toggle = container.querySelector('#toggleMenu')!
        fireEvent.click(toggle)
        const links = Array.from(container.querySelectorAll('.fixed a'))
        const hasBook = links.some(l => l.textContent === 'Book')
        expect(hasBook).toBe(true)
    })
})

describe('Footer', () => {
    it('renders the studio address', () => {
        render(
            <MemoryRouter>
                <Footer />
            </MemoryRouter>
        )
        expect(screen.getByText(/Burwood Rd/)).toBeInTheDocument()
        expect(screen.getByText(/Hawthorn/)).toBeInTheDocument()
    })

    it('renders the Instagram link', () => {
        render(
            <MemoryRouter>
                <Footer />
            </MemoryRouter>
        )
        const igLink = screen.getAllByRole('link').find(
            l => (l as HTMLAnchorElement).href?.includes('instagram.com')
        )
        expect(igLink).toBeDefined()
    })

    it('Instagram link opens in new tab', () => {
        render(
            <MemoryRouter>
                <Footer />
            </MemoryRouter>
        )
        const igLink = screen.getAllByRole('link').find(
            l => (l as HTMLAnchorElement).href?.includes('instagram.com')
        ) as HTMLAnchorElement
        expect(igLink.target).toBe('_blank')
    })
})
