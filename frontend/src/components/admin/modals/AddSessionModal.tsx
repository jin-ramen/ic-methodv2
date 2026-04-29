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

    type RepeatPreset = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';
    const [repeat, setRepeat] = useState<RepeatPreset>('none');
    const [customFreq, setCustomFreq] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly');
    const [customInterval, setCustomInterval] = useState(2);
    const [count, setCount] = useState(8);

    const recurrencePayload = (): {
        frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
        interval: number;
        count: number;
    } | null => {
        switch (repeat) {
            case 'none': return null;
            case 'daily': return { frequency: 'daily', interval: 1, count };
            case 'weekly': return { frequency: 'weekly', interval: 1, count };
            case 'biweekly': return { frequency: 'weekly', interval: 2, count };
            case 'monthly': return { frequency: 'monthly', interval: 1, count };
            case 'yearly': return { frequency: 'yearly', interval: 1, count };
            case 'custom': return { frequency: customFreq, interval: Math.max(1, customInterval), count: Math.max(1, count) };
        }
    };

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>, handleClose: () => void) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            const recurrence = recurrencePayload();
            const res = await fetch(`${BASE}/api/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    method_id: methodId || null,
                    start_time: `${date}T${startTime}`,
                    end_time: `${date}T${endTime}`,
                    capacity,
                    instructor: instructor.trim() || null,
                    ...(recurrence ? { recurrence } : {}),
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

                            <Field label="Repeat">
                                <select value={repeat} onChange={e => setRepeat(e.target.value as RepeatPreset)} className={inputCls}>
                                    <option value="none">Never</option>
                                    <option value="daily">Every Day</option>
                                    <option value="weekly">Every Week</option>
                                    <option value="biweekly">Every 2 Weeks</option>
                                    <option value="monthly">Every Month</option>
                                    <option value="yearly">Every Year</option>
                                    <option value="custom">Custom…</option>
                                </select>
                            </Field>

                            {repeat === 'custom' && (
                                <div className="flex gap-3">
                                    <Field label="Every" className="w-24">
                                        <input
                                            type="number"
                                            min={1}
                                            value={customInterval}
                                            onChange={e => setCustomInterval(Number(e.target.value))}
                                            className={inputCls}
                                        />
                                    </Field>
                                    <Field label="Frequency" className="flex-1">
                                        <select
                                            value={customFreq}
                                            onChange={e => setCustomFreq(e.target.value as typeof customFreq)}
                                            className={inputCls}
                                        >
                                            <option value="daily">Day{customInterval === 1 ? '' : 's'}</option>
                                            <option value="weekly">Week{customInterval === 1 ? '' : 's'}</option>
                                            <option value="monthly">Month{customInterval === 1 ? '' : 's'}</option>
                                            <option value="yearly">Year{customInterval === 1 ? '' : 's'}</option>
                                        </select>
                                    </Field>
                                </div>
                            )}

                            {repeat !== 'none' && (
                                <Field label="End after">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min={1}
                                            max={365}
                                            value={count}
                                            onChange={e => setCount(Number(e.target.value))}
                                            className={inputCls}
                                        />
                                        <span className="font-didot text-wood-text/50 text-xs tracking-wide whitespace-nowrap">
                                            occurrence{count === 1 ? '' : 's'}
                                        </span>
                                    </div>
                                </Field>
                            )}
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
