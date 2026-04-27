import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PhoneInput, { DialSelect, COUNTRIES } from './PhoneInput'

describe('COUNTRIES', () => {
    it('contains at least one country', () => {
        expect(COUNTRIES.length).toBeGreaterThan(0)
    })

    it('each entry has dial, flag, and abbr', () => {
        for (const c of COUNTRIES) {
            expect(c.dial).toMatch(/^\+\d+$/)
            expect(c.flag).toBeTruthy()
            expect(c.abbr).toBeTruthy()
        }
    })

    it('includes Australia (+61)', () => {
        expect(COUNTRIES.some(c => c.dial === '+61' && c.abbr === 'AU')).toBe(true)
    })
})

describe('DialSelect', () => {
    it('renders a select with all country options', () => {
        render(<DialSelect value="+61" onChange={vi.fn()} />)
        const select = screen.getByRole('combobox')
        expect(select).toBeInTheDocument()
        expect(select.querySelectorAll('option').length).toBe(COUNTRIES.length)
    })

    it('shows the selected dial code', () => {
        render(<DialSelect value="+1" onChange={vi.fn()} />)
        const select = screen.getByRole('combobox') as HTMLSelectElement
        expect(select.value).toBe('+1')
    })

    it('calls onChange with new dial code on selection', () => {
        const onChange = vi.fn()
        render(<DialSelect value="+61" onChange={onChange} />)
        const select = screen.getByRole('combobox')
        fireEvent.change(select, { target: { value: '+44' } })
        expect(onChange).toHaveBeenCalledWith('+44')
    })
})

describe('PhoneInput', () => {
    it('renders a tel input with default placeholder', () => {
        render(<PhoneInput onChange={vi.fn()} />)
        expect(screen.getByPlaceholderText('412 345 678')).toBeInTheDocument()
    })

    it('renders a tel input with custom placeholder', () => {
        render(<PhoneInput onChange={vi.fn()} placeholder="000 111 222" />)
        expect(screen.getByPlaceholderText('000 111 222')).toBeInTheDocument()
    })

    it('calls onChange with empty string after clearing a typed number', () => {
        const onChange = vi.fn()
        render(<PhoneInput onChange={onChange} />)
        const input = screen.getByRole('textbox')
        // type something first so the input has a non-empty value
        fireEvent.change(input, { target: { value: '412345678' } })
        expect(onChange).toHaveBeenLastCalledWith('+61412345678')
        // now clear it
        fireEvent.change(input, { target: { value: '' } })
        expect(onChange).toHaveBeenLastCalledWith('')
    })

    it('emits E.164-like string when digits are entered', () => {
        const onChange = vi.fn()
        render(<PhoneInput onChange={onChange} />)
        const input = screen.getByRole('textbox')
        fireEvent.change(input, { target: { value: '412 345 678' } })
        expect(onChange).toHaveBeenCalledWith('+61412345678')
    })

    it('strips non-digit characters from local number', () => {
        const onChange = vi.fn()
        render(<PhoneInput onChange={onChange} />)
        const input = screen.getByRole('textbox')
        fireEvent.change(input, { target: { value: '(02) 9876-5432' } })
        const lastCall = onChange.mock.calls.at(-1)![0]
        expect(lastCall).toMatch(/^\+61\d+$/)
        expect(lastCall).not.toContain('(')
        expect(lastCall).not.toContain('-')
    })

    it('updates emitted value when dial code changes', () => {
        const onChange = vi.fn()
        render(<PhoneInput onChange={onChange} />)

        // type a number first
        fireEvent.change(screen.getByRole('textbox'), { target: { value: '412345678' } })

        // change the country dial
        fireEvent.change(screen.getByRole('combobox'), { target: { value: '+1' } })

        const lastCall = onChange.mock.calls.at(-1)![0]
        expect(lastCall).toMatch(/^\+1\d+$/)
    })

    it('emits empty string when dial changes but no local number typed', () => {
        const onChange = vi.fn()
        render(<PhoneInput onChange={onChange} />)
        fireEvent.change(screen.getByRole('combobox'), { target: { value: '+44' } })
        const lastCall = onChange.mock.calls.at(-1)![0]
        expect(lastCall).toBe('')
    })

    it('respects the required prop on the input', () => {
        render(<PhoneInput onChange={vi.fn()} required />)
        expect(screen.getByRole('textbox')).toBeRequired()
    })
})
