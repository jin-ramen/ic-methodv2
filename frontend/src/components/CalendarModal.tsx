import { useState } from 'react'
import { getTodayDate } from '../utils/dateUtils'
import Calendar from './Calendar'

type Props = {
    today?: Date;
    offset: number;
    maxDays?: number;
    minDays?: number;
    onSelect: (offset: number) => void;
    onClose: () => void;
}

export default function CalendarModal({ today: todayProp, offset, maxDays = 90, minDays = 0, onSelect, onClose }: Props) {
    const [closing, setClosing] = useState(false);

    const today = todayProp ?? getTodayDate();
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + minDays);
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + maxDays);

    const handleClose = () => setClosing(true);
    const handleAnimationEnd = () => { if (closing) onClose(); };
    const handleSelect = (diff: number) => { onSelect(diff); handleClose(); };

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
            </div>
        </div>
    );
}