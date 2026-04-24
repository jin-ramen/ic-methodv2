import { useState, useEffect } from 'react';
import { useAdminContext } from '../../../layouts/AdminLayout';

import Calendar from '../../CalendarModal';

import { Field, inputCls } from '../FormField';

import { getTodayDate, getDate, formatDay, formatDateShort } from '../../../utils/dateUtils';
import { extractError } from '../../../utils/apiUtils';

type Method = { id: string; name: string };

type Props = {
    onClose: () => void;
    onCreated: () => void;
    initialStartTime?: string;
    initialEndTime?: string;
    initialDate?: string;
};

export default function AddSessionModal({ onClose, onCreated, initialStartTime, initialEndTime, initialDate }: Props) {
    const { offset } = useAdminContext();
    const [showCalendar, setShowCalendar] = useState(false);

    const [date, setDate] = useState(initialDate ?? formatDay(getDate(offset)));
    const dateLabel = formatDateShort(new Date(date + 'T00:00:00'));
    const dateOffset = Math.round((new Date(date + 'T00:00:00').getTime() - getTodayDate().getTime()) / 86400000);

    const [methods, setMethods] = useState<Method[]>([]);
    const [startTime, setStartTime] = useState(initialStartTime ?? '09:00');
    const [endTime, setEndTime] = useState(initialEndTime ?? '10:00');
    const [methodId, setMethodId] = useState('');
    const [instructor, setInstructor] = useState('');
    const [capacity, setCapacity] = useState(1);
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
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    method_id: methodId || null,
                    start_time: `${date}T${startTime}`,
                    end_time: `${date}T${endTime}`,
                    capacity,
                    instructor: instructor.trim() || null,
                }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => null);
                throw new Error(extractError(body));
            }
            onCreated();
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
            <div
                className={`absolute inset-0 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
                onClick={handleClose}
            />
            <div
                className={`modal relative bg-wood-dark p-8 w-full max-w-md mx-4 opacity-0 ${closing ? 'animate-modal-out' : 'animate-modal-in'}`}
                onAnimationEnd={handleAnimationEnd}
            >
                <p className="font-cormorant text-wood-text text-xl tracking-wide mb-6">Add Session</p>

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
                            <input
                                type="time"
                                value={startTime}
                                onChange={e => setStartTime(e.target.value)}
                                required
                                className={inputCls}
                            />
                        </Field>
                        <Field label="End Time" className="flex-1">
                            <input
                                type="time"
                                value={endTime}
                                onChange={e => setEndTime(e.target.value)}
                                required
                                className={inputCls}
                            />
                        </Field>
                    </div>

                    <Field label="Method">
                        <select
                            value={methodId}
                            onChange={e => setMethodId(e.target.value)}
                            className={inputCls}
                        >
                            <option value="">— None —</option>
                            {methods.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Instructor">
                        <input
                            type="text"
                            value={instructor}
                            onChange={e => setInstructor(e.target.value)}
                            placeholder="Optional"
                            className={inputCls}
                        />
                    </Field>

                    <Field label="Capacity">
                        <input
                            type="number"
                            min={1}
                            value={capacity}
                            onChange={e => setCapacity(Number(e.target.value))}
                            required
                            className={inputCls}
                        />
                    </Field>

                    {error && (
                        <p className="font-didot text-xs text-red-300 leading-relaxed">{error}</p>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 font-didot text-sm tracking-wide border border-wood-text/20 text-wood-text/60 hover:text-wood-text hover:border-wood-text/40 py-2.5 rounded-lg transition-colors duration-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 font-didot text-sm tracking-wide bg-wood-text/15 text-wood-text hover:bg-wood-text/25 py-2.5 rounded-lg transition-colors duration-200 disabled:opacity-40"
                        >
                            {submitting ? 'Creating…' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        {showCalendar && (
            <Calendar
                today={getTodayDate()}
                offset={dateOffset}
                maxDays={365}
                onSelect={o => { setDate(formatDay(getDate(o))); setShowCalendar(false); }}
                onClose={() => setShowCalendar(false)}
            />
        )}
        </>
    );
}