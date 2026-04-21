import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { FlowType } from '../types/flow'

type Props = {
    data: FlowType[] | null;
    error: string | null;
}

function toDateKey(value: string | Date): string {
    return new Date(value).toLocaleDateString('en-CA');
}

function formatTime(isoString: string): string {
    return new Date(isoString).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getDayLabel(date: Date): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return date.toLocaleDateString('en-AU', { weekday: 'short' });
}

function DayHeader({ date, index = 0 }: { date: Date; index?: number }) {
    return (
        <div
            className="pb-3 border-b border-wood-text/20 opacity-0 animate-text-intro"
            style={{ animationDelay: `${index * 0.1}s` }}
        >
            <p className="font-didot text-wood-text text-xs tracking-widest uppercase">{getDayLabel(date)}</p>
            <p className="font-cormorant text-wood-text/50 text-sm mt-0.5">
                {date.toLocaleDateString('en-AU', { month: 'long', day: 'numeric' })}
            </p>
        </div>
    );
}

function DayContent({ date, flows, onSelect, index = 0 }: { date: Date; flows: FlowType[]; onSelect: (f: FlowType) => void; index?: number }) {
    const sorted = [...flows].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    return (
        <div className="flex flex-col gap-3">
            {sorted.length === 0 ? (
                <p
                    className="font-didot text-wood-text/30 text-xs tracking-widest opacity-0 animate-text-intro"
                    style={{ animationDelay: `${index * 0.1}s` }}
                >
                    No sessions
                </p>
            ) : (
                sorted.map((flow, i) => (
                    <button
                        key={flow.id}
                        onClick={() => onSelect(flow)}
                        className="flow text-left p-3 bg-wood-dark/40 border border-wood-text/10 hover:border-wood-text/40 hover:bg-wood-dark/60 transition-all duration-200 opacity-0 animate-text-intro"
                        style={{ animationDelay: `${(index * 0.1) + (i * 0.08)}s` }}
                    >
                        <p className="font-cormorant text-wood-text text-lg leading-tight">
                            {formatTime(flow.start_time)}
                        </p>
                        <p className="font-cormorant text-wood-text/60 text-sm">
                            – {formatTime(flow.end_time)}
                        </p>
                        {flow.instructor && (
                            <p className="font-didot text-wood-text/70 text-xs tracking-widest mt-2">{flow.instructor}</p>
                        )}
                        <p className="font-didot text-wood-text/30 text-xs mt-1">
                            {flow.capacity} spot{flow.capacity !== 1 ? 's' : ''}
                        </p>
                    </button>
                ))
            )}
        </div>
    );
}

const MAX_DAYS = 30;

export default function Booking({ data, error }: Props) {
    const [offset, setOffset] = useState(0);
    const [calHeight, setCalHeight] = useState<string>('auto');
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getDate = (n: number) => {
        const d = new Date(today);
        d.setDate(today.getDate() + n);
        return d;
    };

    const flowsByDate = (data ?? []).reduce<Record<string, FlowType[]>>((acc, flow) => {
        const key = toDateKey(flow.start_time);
        if (!acc[key]) acc[key] = [];
        acc[key].push(flow);
        return acc;
    }, {});

    const handleSelect = (flow: FlowType) => {
        navigate(`/booking/${flow.id}`, { state: { flow } });
    };

    return (
        <div
            className="cal flex flex-col px-5 md:px-15 overflow-hidden"
            style={{ height: calHeight }}
        >
            <div className="flex-1 min-h-0 flex flex-col bg-wood-accent px-6 py-8 md:px-10 md:py-10 opacity-0 animate-fade-in overflow-hidden" style={{ animationDuration: '0.4s', animationFillMode: 'forwards' }}>
                <h1 className="font-cormorant text-wood-text text-3xl md:text-4xl mb-10 tracking-wide shrink-0">Create a Commitment</h1>

                {error && <p className="font-didot text-red-400 text-xs tracking-widest shrink-0">{error}</p>}

                {/* Mobile: single day view */}
                <div className="md:hidden flex flex-col flex-1 overflow-hidden">
                    <div className="flex items-center justify-between mb-6 shrink-0">
                        <button
                            onClick={() => setOffset(o => Math.max(0, o - 1))}
                            disabled={offset === 0}
                            className="font-didot text-wood-text disabled:opacity-20 text-xs tracking-widest transition-opacity"
                        >
                            ← Prev
                        </button>
                        <p className="font-didot text-wood-text/50 text-xs tracking-widest">
                            {getDate(offset).toLocaleDateString('en-AU', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                        <button
                            onClick={() => setOffset(o => Math.min(MAX_DAYS, o + 1))}
                            disabled={offset >= MAX_DAYS}
                            className="font-didot text-wood-text disabled:opacity-20 text-xs tracking-widest transition-opacity"
                        >
                            Next →
                        </button>
                    </div>
                    <DayHeader date={getDate(offset)} index={0} />
                    <div className="flex-1 overflow-y-auto no-scrollbar mt-3">
                        <DayContent
                            date={getDate(offset)}
                            flows={flowsByDate[toDateKey(getDate(offset))] ?? []}
                            onSelect={handleSelect}
                            index={0}
                        />
                    </div>
                </div>

                {/* Desktop: 5-day column view */}
                <div className="hidden md:flex flex-col flex-1 overflow-hidden">
                    <div className="flex justify-between mb-6 shrink-0">
                        <button
                            onClick={() => setOffset(o => Math.max(0, o - 5))}
                            disabled={offset === 0}
                            className="font-didot text-wood-text disabled:opacity-20 text-xs tracking-widest transition-opacity"
                        >
                            ← Previous week
                        </button>
                        <button
                            onClick={() => setOffset(o => Math.min(MAX_DAYS - 4, o + 5))}
                            disabled={offset >= MAX_DAYS - 4}
                            className="font-didot text-wood-text disabled:opacity-20 text-xs tracking-widest transition-opacity"
                        >
                            Next week →
                        </button>
                    </div>
                    {/* Date headers row — fixed */}
                    <div className="grid grid-cols-5 gap-6 shrink-0 mb-3">
                        {Array.from({ length: 5 }, (_, i) => (
                            <DayHeader key={i} date={getDate(offset + i)} index={i} />
                        ))}
                    </div>
                    {/* Sessions row — each column scrolls independently */}
                    <div className="grid grid-cols-5 gap-6 flex-1 min-h-0">
                        {Array.from({ length: 5 }, (_, i) => {
                            const date = getDate(offset + i);
                            return (
                                <div key={i} className="overflow-y-auto no-scrollbar min-h-0">
                                    <DayContent
                                        date={date}
                                        flows={flowsByDate[toDateKey(date)] ?? []}
                                        onSelect={handleSelect}
                                        index={i}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
