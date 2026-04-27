import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminLoginForm from './AdminLoginForm'

describe('AdminLoginForm', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn())
        localStorage.clear()
    })

    afterEach(() => {
        vi.restoreAllMocks()
        localStorage.clear()
    })

    it('renders the heading and subtitle', () => {
        render(<AdminLoginForm onSuccess={vi.fn()} />)
        expect(screen.getByText('IC Method')).toBeInTheDocument()
        expect(screen.getByText(/Admin access/i)).toBeInTheDocument()
    })

    it('renders email and password fields', () => {
        render(<AdminLoginForm onSuccess={vi.fn()} />)
        expect(screen.getByPlaceholderText('admin@example.com')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
    })

    it('renders the Sign in button', () => {
        render(<AdminLoginForm onSuccess={vi.fn()} />)
        expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    })

    it('shows forbidden warning when forbidden=true', () => {
        render(<AdminLoginForm onSuccess={vi.fn()} forbidden />)
        expect(screen.getByText(/admin access/)).toBeInTheDocument()
    })

    it('does not show forbidden warning when forbidden=false', () => {
        render(<AdminLoginForm onSuccess={vi.fn()} forbidden={false} />)
        expect(screen.queryByText(/doesn't have admin access/)).not.toBeInTheDocument()
    })

    it('disables button and shows "Signing in…" while loading', async () => {
        vi.mocked(fetch).mockReturnValue(new Promise(() => {}))
        render(<AdminLoginForm onSuccess={vi.fn()} />)

        fireEvent.change(screen.getByPlaceholderText('admin@example.com'), { target: { value: 'a@b.com' } })
        fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass' } })
        fireEvent.submit(screen.getByRole('button'))

        await waitFor(() => expect(screen.getByRole('button')).toBeDisabled())
        expect(screen.getByRole('button').textContent).toBe('Signing in…')
    })

    it('shows 404 error message when account not found', async () => {
        vi.mocked(fetch).mockResolvedValue({ ok: false, status: 404, json: async () => ({}) } as Response)
        render(<AdminLoginForm onSuccess={vi.fn()} />)

        fireEvent.change(screen.getByPlaceholderText('admin@example.com'), { target: { value: 'a@b.com' } })
        fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass' } })
        fireEvent.submit(screen.getByRole('button'))

        await waitFor(() => screen.getByText('No account found with that email.'))
    })

    it('shows 401 error message for wrong password', async () => {
        vi.mocked(fetch).mockResolvedValue({ ok: false, status: 401, json: async () => ({}) } as Response)
        render(<AdminLoginForm onSuccess={vi.fn()} />)

        fireEvent.change(screen.getByPlaceholderText('admin@example.com'), { target: { value: 'a@b.com' } })
        fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrong' } })
        fireEvent.submit(screen.getByRole('button'))

        await waitFor(() => screen.getByText('Incorrect password.'))
    })

    it('shows generic error for unexpected server error', async () => {
        vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500, json: async () => ({}) } as Response)
        render(<AdminLoginForm onSuccess={vi.fn()} />)

        fireEvent.change(screen.getByPlaceholderText('admin@example.com'), { target: { value: 'a@b.com' } })
        fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass' } })
        fireEvent.submit(screen.getByRole('button'))

        await waitFor(() => screen.getByText('Something went wrong.'))
    })

    it('shows network error when fetch throws', async () => {
        vi.mocked(fetch).mockRejectedValue(new Error('Network error'))
        render(<AdminLoginForm onSuccess={vi.fn()} />)

        fireEvent.change(screen.getByPlaceholderText('admin@example.com'), { target: { value: 'a@b.com' } })
        fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass' } })
        fireEvent.submit(screen.getByRole('button'))

        await waitFor(() => screen.getByText('Could not reach the server.'))
    })

    it('calls onSuccess and stores token on successful login', async () => {
        const onSuccess = vi.fn()
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ access_token: 'my-token' }),
        } as Response)

        render(<AdminLoginForm onSuccess={onSuccess} />)

        fireEvent.change(screen.getByPlaceholderText('admin@example.com'), { target: { value: 'admin@example.com' } })
        fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'correct' } })
        fireEvent.submit(screen.getByRole('button'))

        await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce())
        expect(localStorage.getItem('access_token')).toBe('my-token')
    })

    it('sends POST to /api/login with form data', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => ({ access_token: 'tok' }),
        } as Response)

        render(<AdminLoginForm onSuccess={vi.fn()} />)

        fireEvent.change(screen.getByPlaceholderText('admin@example.com'), { target: { value: 'user@test.com' } })
        fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'secret123' } })
        fireEvent.submit(screen.getByRole('button'))

        await waitFor(() =>
            expect(vi.mocked(fetch)).toHaveBeenCalledWith(
                expect.stringContaining('/api/login'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ identifier: 'user@test.com', password: 'secret123' }),
                })
            )
        )
    })
})
