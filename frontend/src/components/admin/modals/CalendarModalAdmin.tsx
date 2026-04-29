import { useState } from 'react'
import { useAdminContext } from '../../../layouts/AdminLayout'
import { getTodayDate, getDate } from '../../../utils/dateUtils'
import Calendar from '../../Calendar'

const MAX_DAYS = 90;

type Props = {
    onClose: () => void;
    /** When provided, the modal manages a local date selection instead of the admin context offset. */
    value?: Date | null;
    onSelect?: (date: Date) => void;
    /** Render a "Clear" button that calls this handler then closes. */
    onClear?: () => void;
}

export default function CalendarModalAdmin({ onClose, value, onSelect, onClear }: Props) {
    const ctx = useAdminContext();
    const [closing, setClosing] = useState(false);

    const today = getTodayDate();
    const minDate = getDate(-MAX_DAYS);
    const maxDate = getDate(MAX_DAYS);

    const local = onSelect != null;
    const localOffset = value
        ? Math.round((new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime() - today.getTime()) / 86400000)
        : 0;
    const offset = local ? localOffset : ctx.offset;

    const handleClose = () => setClosing(true);
    const handleAnimationEnd = () => { if (closing) onClose(); };
    const handleSelect = (diff: number) => {
        if (local && onSelect) {
            const d = new Date(today);
            d.setDate(today.getDate() + diff);
            onSelect(d);
        } else {
            ctx.setOffset(diff);
        }
        handleClose();
    };
    const handleClear = () => {
        onClear?.();
        handleClose();
    };

    return (
        <div className="lg:bg-black/40 fixed inset-0 z-50 flex items-center justify-center">
            <div
                className={`absolute inset-0 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
                onClick={handleClose}
            />
            <div
                className={`modal relative bg-wood-dark/90 p-6 shrink-0 opacity-0 ${closing ? 'animate-modal-out' : 'animate-modal-in'}`}
                style={{ width: 320, minHeight: 360 }}
                onAnimationEnd={handleAnimationEnd}
            >
                <Calendar today={today} offset={offset} minDate={minDate} maxDate={maxDate} onSelect={handleSelect} />
                {onClear && (
                    <button
                        onClick={handleClear}
                        className="mt-4 w-full font-didot text-[10px] tracking-widest uppercase text-wood-text/60 hover:text-wood-text border border-wood-text/20 hover:border-wood-text/40 py-2 rounded transition-colors"
                    >
                        Clear date
                    </button>
                )}
            </div>
        </div>
    );
}