import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import type { SessionType } from '../types/session'

import { toDateKey, getTodayDate, getDate } from '../utils/dateUtils'

import Calendar from '../components/CalendarModal'
import DayHeader from '../components/booking/DayHeader'
import DayContent from '../components/booking/DayContent'

type Props = {
    data: SessionType[] | null;
    error: string | null;
    loading: boolean;
    refetch: () => void;
}

const MAX_DAYS = 90;

const POLL_MS = 30_000;

export default function Booking({ data, error, loading, refetch }: Props) {
    const [searchParams, setSearchParams] = useSearchParams();
    const offset = Math.min(MAX_DAYS, Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10)));
    const setOffset = (n: number) => setSearchParams(p => { p.set('offset', n.toString()); return p; }, { replace: true });

    const [showPicker, setShowPicker] = useState(false);
    const [calHeight, setCalHeight] = useState<string>('auto');
    const [navigated, setNavigated] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const body = document.body;
        const prevBodyOverflow = body.style.overflow;
        body.style.overflow = 'hidden';

        const header = document.querySelector('header');
        const footer = document.querySelector('footer');

        const measure = () => {
            const h = header?.getBoundingClientRect().height ?? 0;
            const f = footer?.getBoundingClientRect().height ?? 0;
            setCalHeight(`calc(100dvh - ${h}px - ${f}px)`);
        };

        measure();
        window.addEventListener('resize', measure);
        return () => {
            window.removeEventListener('resize', measure);
            body.style.overflow = prevBodyOverflow;
        };
    }, []);

    useEffect(() => {
        const id = setInterval(refetch, POLL_MS);
        const onVisible = () => { if (document.visibilityState === 'visible') refetch(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            clearInterval(id);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [refetch]);

    const SessionsByDate = useMemo(
        () => (data ?? []).reduce<Record<string, SessionType[]>>((acc, session) => {
            const key = toDateKey(session.start_time);
            if (!acc[key]) acc[key] = [];
            acc[key].push(session);
            return acc;
        }, {}),
        [data]
    );

    const handleSelect = (session: SessionType) => {
        navigate(`/booking/${session.id}`, { state: { session, back: searchParams.toString() } });
    };

    return (
        <div
            className="cal flex flex-col px-5 py-5 overflow-hidden"
            style={{ height: calHeight }}
        >
            <div className="flex-1 min-h-0 flex flex-col bg-wood-accent/95 px-6 py-6 md:px-15 md:pt-5 opacity-0 animate-fade-in overflow-hidden rounded-xl" style={{ animationDuration: '0.4s', animationFillMode: 'forwards' }}>
                <div className="hidden md:flex items-center justify-between mb-5 shrink-0">
                    <h1 className="font-cormorant text-wood-text text-3xl md:text-4xl tracking-wide">Create a Commitment</h1>
                    <button onClick={() => setShowPicker(p => !p)} className="focus:outline-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-auto text-wood-text/40 hover:text-wood-text/70 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                    </button>
                </div>

                {error && <p className="font-didot text-red-400 text-xs tracking-widest shrink-0">{error}</p>}

                <div className="lg:hidden flex flex-col flex-1 overflow-hidden">
                    <DayHeader date={getDate(offset)} index={0} onIconClick={() => setShowPicker(p => !p)} animate={!navigated} />
                    <div className="flex-1 overflow-y-auto no-scrollbar mt-3">
                        <DayContent
                            flows={SessionsByDate[toDateKey(getDate(offset))] ?? []}
                            onSelect={handleSelect}
                            index={0}
                            loading={loading && data === null}
                            animate={!navigated}
                        />
                    </div>
                    <div className="flex items-center justify-between mt-6 shrink-0">
                        <button
                            onClick={() => { setOffset(Math.max(0, offset - 1)); setShowPicker(false); setNavigated(true); }}
                            disabled={offset === 0}
                            className="font-didot text-wood-text/70 hover:text-wood-text disabled:opacity-20 text-xl border border-wood-text/30 hover:border-wood-text/60 rounded-xl disabled:hover:border-wood-text/30 w-12 h-12 flex items-center justify-center leading-none transition-colors"
                        >
                            ‹
                        </button>
                        <button
                            onClick={() => { setOffset(Math.min(MAX_DAYS, offset + 1)); setShowPicker(false); setNavigated(true); }}
                            disabled={offset >= MAX_DAYS}
                            className="font-didot text-wood-text/70 hover:text-wood-text disabled:opacity-20 text-xl border border-wood-text/30 hover:border-wood-text/60 rounded-xl disabled:hover:border-wood-text/30 w-12 h-12 flex items-center justify-center leading-none transition-colors"
                        >
                            ›
                        </button>
                    </div>
                </div>

                <div className="hidden lg:flex flex-col flex-1 overflow-hidden">
                    <div className="flex justify-between mb-6 shrink-0">
                        <button
                            onClick={() => { setOffset(Math.max(0, offset - 1)); setShowPicker(false); setNavigated(true); }}
                            disabled={offset === 0}
                            className="font-didot text-wood-text disabled:opacity-20 text-md tracking-widest transition-opacity"
                        >
                            ← Previous
                        </button>
                        <button
                            onClick={() => { setOffset(Math.min(MAX_DAYS - 4, offset + 1)); setShowPicker(false); setNavigated(true); }}
                            disabled={offset >= MAX_DAYS - 4}
                            className="font-didot text-wood-text disabled:opacity-20 text-md tracking-widest transition-opacity"
                        >
                            Next →
                        </button>
                    </div>
                    <div className="grid grid-cols-5 gap-6 shrink-0 mb-3">
                        {Array.from({ length: 5 }, (_, i) => (
                            <DayHeader key={i} date={getDate(offset + i)} index={i} animate={!navigated} />
                        ))}
                    </div>
                    <div className="grid grid-cols-5 gap-6 flex-1 min-h-0">
                        {Array.from({ length: 5 }, (_, i) => {
                            const date = getDate(offset + i);
                            return (
                                <div key={i} className="overflow-y-auto no-scrollbar min-h-0">
                                    <DayContent
                                        flows={SessionsByDate[toDateKey(date)] ?? []}
                                        onSelect={handleSelect}
                                        index={i}
                                        loading={loading && data === null}
                                        animate={!navigated}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            {showPicker && (
                <Calendar
                    today={getTodayDate()}
                    offset={offset}
                    maxDays={MAX_DAYS}
                    onSelect={setOffset}
                    onClose={() => setShowPicker(false)}
                />
            )}
        </div>
    );
}
