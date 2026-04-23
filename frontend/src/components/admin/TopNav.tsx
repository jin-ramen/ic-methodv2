import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import CalendarPicker from '../CalendarPicker';

const titleMap: Record<string, string> = {
    '/dashboard': 'Dashboard',
};

type Props = {
    today: Date;
    offset: number;
    onOffsetChange: (offset: number) => void;
};

export default function TopNav({ today, offset, onOffsetChange }: Props) {
    const { pathname } = useLocation();
    const title = titleMap[pathname] ?? 'Admin';
    const [open, setOpen] = useState(false);

    const selected = new Date(today);
    selected.setDate(today.getDate() + offset);

    const dateLabel = selected.toLocaleDateString('en-AU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

    return (
        <>
            <header className="flex items-center justify-between px-6 py-5 border-b border-wood-accent/20">
                <h1 className="font-cormorant text-3xl text-wood-dark">{title}</h1>
                <button
                    onClick={() => setOpen(true)}
                    className="flex items-center gap-2 font-didot text-sm tracking-wide text-wood-accent hover:text-wood-dark border border-wood-accent/30 hover:border-wood-accent/60 rounded px-3 py-1.5 transition-colors duration-300"
                >
                    {dateLabel}
                    <svg className="w-3 h-3 shrink-0" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 1l4 4 4-4" />
                    </svg>
                </button>
            </header>

            {open && (
                <CalendarPicker
                    today={today}
                    offset={offset}
                    maxDays={365}
                    onSelect={onOffsetChange}
                    onClose={() => setOpen(false)}
                />
            )}
        </>
    );
}