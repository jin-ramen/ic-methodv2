import { useState } from 'react'
import { useAdminContext } from '../../../layouts/AdminLayout'
import { getTodayDate, getDate } from '../../../utils/dateUtils'
import Calendar from '../../Calendar'

const MAX_DAYS = 90;

type Props = {
    onClose: () => void;
}

export default function CalendarModalAdmin({ onClose }: Props) {
    const { offset, setOffset } = useAdminContext();
    const [closing, setClosing] = useState(false);

    const today = getTodayDate();
    const minDate = getDate(-MAX_DAYS);
    const maxDate = getDate(MAX_DAYS);

    const handleClose = () => setClosing(true);
    const handleAnimationEnd = () => { if (closing) onClose(); };
    const handleSelect = (diff: number) => { setOffset(diff); handleClose(); };

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