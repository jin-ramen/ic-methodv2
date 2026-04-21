import { useState } from 'react'
import { toDateKey } from '../utils/dateUtils'

type Props = {
    today: Date;
    offset: number;
    maxDays: number;
    onSelect: (offset: number) => void;
    onClose: () => void;
}

export default function CalendarPicker({ today, offset, maxDays, onSelect, onClose }: Props) {
    const selected = new Date(today);
    selected.setDate(today.getDate() + offset);

    const [viewYear, setViewYear] = useState(selected.getFullYear());
    const [viewMonth, setViewMonth] = useState(selected.getMonth());
    const [closing, setClosing] = useState(false);

    const handleClose = () => setClosing(true);

    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + maxDays);

    const prevDisabled = viewYear === today.getFullYear() && viewMonth === today.getMonth();
    const nextDisabled = new Date(viewYear, viewMonth + 1, 1) > maxDate;

    const handlePrev = () => {
        if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
        else setViewMonth(m => m - 1);
    };
    const handleNext = () => {
        if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
        else setViewMonth(m => m + 1);
    };

    const startDow = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (Date | null)[] = Array.from({ length: startDow }, () => null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));
    while (cells.length < 42) cells.push(null);

    const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className={`absolute inset-0 bg-black/40 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
                onClick={handleClose}
            />
            <div
                className={`modal relative bg-wood-accent border border-wood-text/20 p-6 shrink-0 opacity-0 ${closing ? 'animate-modal-out' : 'animate-modal-in'}`}
                style={{ width: 320, height: 360 }}
                onAnimationEnd={closing ? onClose : undefined}
            >
                <div className="flex items-center justify-between mb-4">
                    <button onClick={handlePrev} disabled={prevDisabled} className="font-didot text-wood-text disabled:opacity-20 text-md tracking-widest transition-opacity">←</button>
                    <p className="font-cormorant text-wood-text text-lg tracking-wide">{monthLabel}</p>
                    <button onClick={handleNext} disabled={nextDisabled} className="font-didot text-wood-text disabled:opacity-20 text-md tracking-widest transition-opacity">→</button>
                </div>
                <div className="grid grid-cols-7 mb-1">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                        <p key={d} className="font-didot text-wood-text/30 text-md tracking-widest text-center py-1">{d}</p>
                    ))}
                </div>
                <div className="grid grid-cols-7">
                    {cells.map((date, i) => {
                        if (!date) return <div key={i} className="py-1.5" />;
                        const isDisabled = date < today || date > maxDate;
                        const isSelected = toDateKey(date) === toDateKey(selected);
                        const isToday = toDateKey(date) === toDateKey(today);
                        const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
                        return (
                            <button
                                key={i}
                                disabled={isDisabled}
                                onClick={() => { onSelect(diff); handleClose(); }}
                                className={`font-cormorant text-xl py-1.5 text-center transition-colors ${
                                    isDisabled ? 'text-wood-text/15 cursor-default' :
                                    isSelected ? 'bg-wood-text/20 text-wood-text' :
                                    isToday ? 'text-wood-text underline underline-offset-2' :
                                    'text-wood-text/60 hover:text-wood-text'
                                }`}
                            >
                                {date.getDate()}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
