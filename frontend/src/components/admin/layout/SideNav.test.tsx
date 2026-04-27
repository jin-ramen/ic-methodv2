import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../../layouts/AdminLayout', () => ({
    useAdminContext: vi.fn(),
}))

import { useAdminContext } from '../../../layouts/AdminLayout'
import SideNav from './SideNav'

const mockCtx = vi.mocked(useAdminContext)

function renderSideNav(name = 'Jane Smith', role = 'admin', path = '/dashboard') {
    mockCtx.mockReturnValue({
        selectedDate: new Date(),
        offset: 0,
        setOffset: () => {},
        role,
        userId: 'u1',
        name,
    })
    return render(
        <MemoryRouter initialEntries={[path]}>
            <SideNav />
        </MemoryRouter>
    )
}

describe('SideNav', () => {
    it('renders the IC Method brand link', () => {
        renderSideNav()
        expect(screen.getByText('IC Method')).toBeInTheDocument()
    })

    it('renders all navigation links', () => {
        renderSideNav()
        for (const label of ['Dashboard', 'Schedule', 'Bookings', 'Clients', 'Staff', 'Methods']) {
            expect(screen.getByText(label)).toBeInTheDocument()
        }
    })

    it('shows user name in the profile area', () => {
        renderSideNav('Alice Tan')
        expect(screen.getByText('Alice Tan')).toBeInTheDocument()
    })

    it('shows user role in the profile area', () => {
        renderSideNav('Alice Tan', 'owner')
        expect(screen.getByText('owner')).toBeInTheDocument()
    })

    it('derives initials from the user name', () => {
        renderSideNav('Bob Williams')
        expect(screen.getByText('BW')).toBeInTheDocument()
    })

    it('uses only first two initials for a long name', () => {
        renderSideNav('Alice Mary Jane Doe')
        expect(screen.getByText('AM')).toBeInTheDocument()
    })

    it('handles a single-word name for initials', () => {
        renderSideNav('Madonna')
        expect(screen.getByText('M')).toBeInTheDocument()
    })

    it('highlights the active route with a distinct class', () => {
        renderSideNav('Jane Smith', 'admin', '/dashboard')
        const dashboardLink = screen.getByRole('link', { name: /Dashboard/ })
        expect(dashboardLink.className).toContain('bg-wood-accent/10')
    })

    it('active route link uses dark text', () => {
        renderSideNav('Jane Smith', 'admin', '/dashboard')
        const dashboardLink = screen.getByRole('link', { name: /Dashboard/ })
        expect(dashboardLink.className).toContain('text-wood-dark')
    })

    it('inactive route link does not have active background', () => {
        renderSideNav('Jane Smith', 'admin', '/dashboard')
        const scheduleLink = screen.getByRole('link', { name: /Schedule/ })
        expect(scheduleLink.className).not.toContain('bg-wood-accent/10')
    })
})
