import { useState, useEffect } from 'react';
import { useAdminContext } from '../../../layouts/AdminLayout';

import type { SessionType } from '../../../types/SessionType';
import Calendar from '../../CalendarModal';
import { Field, inputCls } from '../FormField';


import { formatDateShort, formatDay, formatTime24, getDate, getTodayDate } from '../../../utils/dateUtils';
import { extractError } from '../../../utils/apiUtils';

type Method = { id: string; name: string };

type Props = {
    session: SessionType;
    onClose: () => void;
    onUpdated: () => void;
};

export default function EditSessionModal({ session: f, onClose, onUpdated }: Props) {
    const { offset, setOffset } = useAdminContext();
    const [showCalendar, setShowCalendar] = useState(false);

    const selectedDate = getDate(offset);
    const dateValue = formatDay(selectedDate);
    const dateLabel = formatDateShort(selectedDate);

    const [methods, setMethods] = useState<Method[]>([]);
    const [startTime, setStartTime] = useState(formatTime24(f.start_time));
    const [endTime, setEndTime] = useState(formatTime24(f.end_time));
    const [methodId, setMethodId] = useState(f.method_id ?? '');
    const [instructor, setInstructor] = useState(f.instructor ?? '');
    const [capacity, setCapacity] = useState(f.capacity);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/methods`)
            .then(r => r.json())
            .then(j => setMethods(j.results ?? []))
            .catch(() => {});
    }, []);

    const handleClose = () => setClosing(true);
    const handleAnimationEnd = () => { if (closing) onClose(); };

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/sessions/${f.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    method_id: methodId || null,
                    start_time: `${dateValue}T${startTime}`,
                    end_time: `${dateValue}T${endTime}`,
                    capacity,
                    instructor: instructor.trim() || null,
                }),
            });
            if (!res.ok) throw new Error(extractError(await res.json().catch(() => null)));
            onUpdated();
            handleClose();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
        <div className="lg:bg-black/40 fixed inset-0 z-50 flex items-center justify-center">
            <div className={`absolute inset-0 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`} onClick={handleClose} />
            <div
                className={`modal relative bg-wood-dark p-8 w-full max-w-md mx-4 opacity-0 ${closing ? 'animate-modal-out' : 'animate-modal-in'}`}
                onAnimationEnd={handleAnimationEnd}
            >
                <p className="font-cormorant text-wood-text text-xl tracking-wide mb-6">Edit Session</p>
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <Field label="Date">
                        <button
                            type="button"
                            onClick={() => setShowCalendar(true)}
                            className={inputCls + ' text-left'}
                        >
                            {dateLabel}
                        </button>
                    </Field>
                    <div className="flex gap-4">
                        <Field label="Start Time" className="flex-1">
                            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required className={inputCls} />
                        </Field>
                        <Field label="End Time" className="flex-1">
                            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required className={inputCls} />
                        </Field>
                    </div>
                    <Field label="Method">
                        <select value={methodId} onChange={e => setMethodId(e.target.value)} className={inputCls}>
                            <option value="">— None —</option>
                            {methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Instructor">
                        <input type="text" value={instructor} onChange={e => setInstructor(e.target.value)} placeholder="Optional" className={inputCls} />
                    </Field>
                    <Field label="Capacity">
                        <input type="number" min={1} value={capacity} onChange={e => setCapacity(Number(e.target.value))} required className={inputCls} />
                    </Field>
                    {error && <p className="font-didot text-xs text-red-300 leading-relaxed">{error}</p>}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={handleClose} className="flex-1 font-didot text-sm tracking-wide border border-wood-text/20 text-wood-text/60 hover:text-wood-text hover:border-wood-text/40 py-2.5 rounded-lg transition-colors duration-200">Cancel</button>
                        <button type="submit" disabled={submitting} className="flex-1 font-didot text-sm tracking-wide bg-wood-text/15 text-wood-text hover:bg-wood-text/25 py-2.5 rounded-lg transition-colors duration-200 disabled:opacity-40">{submitting ? 'Saving…' : 'Save'}</button>
                    </div>
                </form>
            </div>
        </div>

        {showCalendar && (
            <Calendar
                today={getTodayDate()}
                offset={offset}
                maxDays={365}
                onSelect={o => setOffset(o)}
                onClose={() => setShowCalendar(false)}
            />
        )}
        </>
    );
}