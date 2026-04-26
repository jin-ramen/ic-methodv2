import { useState } from 'react'

export const COUNTRIES = [
    { dial: '+61',  flag: '🇦🇺', abbr: 'AU' },
    { dial: '+64',  flag: '🇳🇿', abbr: 'NZ' },
    { dial: '+1',   flag: '🇺🇸', abbr: 'US' },
    { dial: '+44',  flag: '🇬🇧', abbr: 'GB' },
    { dial: '+65',  flag: '🇸🇬', abbr: 'SG' },
    { dial: '+86',  flag: '🇨🇳', abbr: 'CN' },
    { dial: '+81',  flag: '🇯🇵', abbr: 'JP' },
    { dial: '+82',  flag: '🇰🇷', abbr: 'KR' },
    { dial: '+852', flag: '🇭🇰', abbr: 'HK' },
    { dial: '+91',  flag: '🇮🇳', abbr: 'IN' },
    { dial: '+33',  flag: '🇫🇷', abbr: 'FR' },
    { dial: '+49',  flag: '🇩🇪', abbr: 'DE' },
];

interface DialSelectProps {
    value: string;
    onChange: (dial: string) => void;
}

export function DialSelect({ value, onChange }: DialSelectProps) {
    return (
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            className="bg-transparent font-didot text-wood-text text-sm py-2 md:py-3 pr-1 outline-none cursor-pointer shrink-0"
            style={{ colorScheme: 'dark' }}
        >
            {COUNTRIES.map(c => (
                <option key={c.dial} value={c.dial}>{c.flag} {c.dial}</option>
            ))}
        </select>
    );
}

interface PhoneInputProps {
    onChange: (e164: string) => void;
    required?: boolean;
    placeholder?: string;
}

export default function PhoneInput({ onChange, required, placeholder = '412 345 678' }: PhoneInputProps) {
    const [dial, setDial] = useState('+61');
    const [local, setLocal] = useState('');

    const emit = (newDial: string, newLocal: string) => {
        const digits = newLocal.replace(/\D/g, '');
        onChange(digits ? `${newDial}${digits}` : '');
    };

    return (
        <div className="flex items-end gap-2 border-b border-wood-text/30 focus-within:border-wood-text transition-colors duration-200">
            <DialSelect value={dial} onChange={d => { setDial(d); emit(d, local); }} />
            <span className="font-didot text-wood-text/20 text-sm py-2 md:py-3 select-none">|</span>
            <input
                type="tel"
                required={required}
                placeholder={placeholder}
                value={local}
                onChange={e => { setLocal(e.target.value); emit(dial, e.target.value); }}
                className="flex-1 bg-transparent font-didot text-wood-text text-sm md:text-base py-2 md:py-3 tracking-wide outline-none placeholder:text-wood-text/30"
            />
        </div>
    );
}