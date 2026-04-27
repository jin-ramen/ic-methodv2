import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Field, inputCls } from './FormField'

describe('inputCls', () => {
    it('is a non-empty string', () => {
        expect(typeof inputCls).toBe('string')
        expect(inputCls.length).toBeGreaterThan(0)
    })

    it('contains key Tailwind utility classes', () => {
        expect(inputCls).toContain('w-full')
        expect(inputCls).toContain('rounded-lg')
        expect(inputCls).toContain('border')
    })
})

describe('Field component', () => {
    it('renders the label text', () => {
        render(<Field label="Email"><input /></Field>)
        expect(screen.getByText('Email')).toBeInTheDocument()
    })

    it('renders children inside the field', () => {
        render(
            <Field label="Name">
                <input data-testid="name-input" />
            </Field>
        )
        expect(screen.getByTestId('name-input')).toBeInTheDocument()
    })

    it('applies extra className when provided', () => {
        const { container } = render(
            <Field label="Age" className="col-span-2">
                <input />
            </Field>
        )
        expect(container.firstChild).toHaveClass('col-span-2')
    })

    it('does not blow up without className', () => {
        const { container } = render(
            <Field label="Test"><span /></Field>
        )
        expect(container.firstChild).toBeInTheDocument()
    })
})
