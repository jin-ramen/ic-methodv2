import { useState } from 'react';
import { useAdminContext } from '../../../layouts/AdminLayout';
import Calendar from '../../CalendarModal';
import AdminModal from './AdminModal';
import { Field, inputCls } from '../FormField';
import { getTodayDate, getDate, formatDay, formatDateShort } from '../../../utils/dateUtils';
import { extractError, BASE } from '../../../utils/apiUtils';
import { useSessionFormData } from '../../../hooks/useSessionFormData';

type Props = {
    onClose: () => void;
    onCreated: () => void;
    initialStartTime?: string;
    initialEndTime?: string;
    initialDate?: string;
};

export default function AddSessionModal({ onClose, onCreated, initialStartTime, initialEndTime, initialDate }: Props) {
    const { offset } = useAdminContext();
    const { methods, staffList } = useSessionFormData();
    const [showCalendar, setShowCalendar] = useState(false);

    const [date, setDate] = useState(initialDate ?? formatDay(getDate(offset)));
    const dateLabel = formatDateShort(new Date(date + 'T00:00:00'));
    const dateOffset = Math.round((new Date(date + 'T00:00:00').getTime() - getTodayDate().getTime()) / 86400000);

    const [startTime, setStartTime] = useState(initialStartTime ?? '09:00');
    const [endTime, setEndTime] = useState(initialEndTime ?? '10:00');
    const [methodId, setMethodId] = useState('');
    const [instructor, setInstructor] = useState('');
    const [capacity, setCapacity] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>, handleClose: () => void) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            const res = await fetch(`${BASE}/api/sessions`, {
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
            if (!res.ok) throw new Error(extractError(await res.json().catch(() => null)));
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
            <AdminModal onClose={onClose}>
                {handleClose => (
                    <>
                        <p className="font-cormorant text-wood-text text-xl tracking-wide mb-6">Add Session</p>
                        <form onSubmit={e => handleSubmit(e, handleClose)} className="flex flex-col gap-5">
                            <Field label="Date">
                                <button type="button" onClick={() => setShowCalendar(true)} className={inputCls + ' text-left'}>
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
                                <select value={methodId} onChange={e => setMethodId(e.target.value)} required className={inputCls}>
                                    <option value="" disabled>— Select —</option>
                                    {methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </Field>
                            <Field label="Instructor">
                                <select value={instructor} onChange={e => setInstructor(e.target.value)} required className={inputCls}>
                                    <option value="" disabled>— Select —</option>
                                    {staffList.map(s => {
                                        const name = `${s.first_name} ${s.last_name}`;
                                        return <option key={s.id} value={name}>{name}</option>;
                                    })}
                                </select>
                            </Field>
                            <Field label="Capacity">
                                <input type="number" min={1} value={capacity} onChange={e => setCapacity(Number(e.target.value))} required className={inputCls} />
                            </Field>
                            {error && <p className="font-didot text-xs text-red-300 leading-relaxed">{error}</p>}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={handleClose} className="flex-1 font-didot text-sm tracking-wide border border-wood-text/20 text-wood-text/60 hover:text-wood-text hover:border-wood-text/40 py-2.5 rounded-lg transition-colors duration-200">
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting} className="flex-1 font-didot text-sm tracking-wide bg-wood-text/15 text-wood-text hover:bg-wood-text/25 py-2.5 rounded-lg transition-colors duration-200 disabled:opacity-40">
                                    {submitting ? 'Creating…' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </AdminModal>

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
