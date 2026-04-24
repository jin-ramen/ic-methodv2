import { useState, useMemo, useEffect } from 'react'

import { useFetch } from '../../utils/useFetch'
import { useAdminContext } from '../../layouts/AdminLayout'
import { toDateKey, getDate, getDayLabel, formatTime, formatDay } from '../../utils/dateUtils'

import type { SessionType } from '../../types/SessionType'

import SessionModal from '../../components/admin/modal/SessionModal'
import AddSessionModal from '../../components/admin/modal/AddSessionModal'

const MAX_DAYS = 90;
const START_HOUR = 9;
const END_HOUR = 19; // 7pm
const NUM_HOURS = END_HOUR - START_HOUR;
const HOUR_PX_MIN = 60;
const HOUR_PX_MAX = 160;
const HOUR_PX_STEP = 20;
const HOUR_PX_DEFAULT = 100;
const TIME_COL_W = 44;

const HOURS = Array.from({ length: NUM_HOURS }, (_, i) => START_HOUR + i);

function hourLabel(h: number) {
    if (h === 12) return '12pm';
    return h < 12 ? `${h}am` : `${h - 12}pm`;
}

function sessionStyle(session: SessionType, hourPx: number): { top: number; height: number } | null {
    const start = new Date(session.start_time);
    const end = new Date(session.end_time);
    const startMins = (start.getHours() - START_HOUR) * 60 + start.getMinutes();
    const endMins = (end.getHours() - START_HOUR) * 60 + end.getMinutes();
    if (endMins <= 0 || startMins >= NUM_HOURS * 60) return null;
    const s = Math.max(0, startMins);
    const e = Math.min(NUM_HOURS * 60, endMins);
    return {
        top: (s / 60) * hourPx,
        height: Math.max(((e - s) / 60) * hourPx, 28),
    };
}

const DAYS_DESKTOP = 5;
const DAYS_OFFSET = -Math.floor(DAYS_DESKTOP / 2); // -2, so selected date is at column 2 (center)

type LayoutItem = { session: SessionType; col: number; totalCols: number };

function layoutSessions(sessions: SessionType[]): LayoutItem[] {
    const sorted = [...sessions].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
    const colEnds: number[] = [];
    const items: Array<{ session: SessionType; col: number; startMs: number; endMs: number }> = [];

    for (const session of sorted) {
        const startMs = new Date(session.start_time).getTime();
        const endMs = new Date(session.end_time).getTime();
        let col = colEnds.findIndex(t => t <= startMs);
        if (col === -1) { col = colEnds.length; colEnds.push(endMs); }
        else colEnds[col] = endMs;
        items.push({ session, col, startMs, endMs });
    }

    return items.map(a => {
        // totalCols = max column index among all sessions overlapping with a, + 1
        let totalCols = 1;
        for (const b of items) {
            if (a.startMs < b.endMs && a.endMs > b.startMs) {
                totalCols = Math.max(totalCols, b.col + 1);
            }
        }
        return { session: a.session, col: a.col, totalCols };
    });
}

function SessionCard({ session, style: s, col, totalCols, onClick }: {
    session: SessionType;
    style: { top: number; height: number };
    col: number;
    totalCols: number;
    onClick: () => void;
}) {
    const isPast = new Date(session.start_time) <= new Date();
    const isFull = session.spots_remaining === 0;
    const leftPct = (col / totalCols) * 100;
    const widthPct = (1 / totalCols) * 100;
    return (
        <button
            onClick={e => { e.stopPropagation(); onClick(); }}
            className={`absolute rounded-lg px-2 py-1 text-left transition-all hover:brightness-110 active:scale-[0.98] overflow-hidden ${isPast ? 'opacity-40' : ''} ${isFull ? 'bg-wood-accent/20 border border-wood-accent/30 text-wood-dark' : 'bg-wood-accent text-white'}`}
            style={{
                top: s.top + 1,
                height: s.height - 2,
                left: `calc(${leftPct}% + 1px)`,
                width: `calc(${widthPct}% - 2px)`,
            }}
        >
            <p className="font-didot text-xs tracking-wide truncate leading-tight">{session.method_name ?? 'Session'}</p>
            {s.height > 36 && <p className="font-didot text-[10px] opacity-70 leading-tight truncate">{formatTime(session.start_time)} – {formatTime(session.end_time)}</p>}
            {s.height > 52 && session.instructor && <p className="font-didot text-[10px] opacity-60 leading-tight truncate">{session.instructor}</p>}
            {s.height > 68 && <p className="font-didot text-[10px] opacity-60 leading-tight">{isFull ? 'Full' : `${session.spots_remaining} left`}</p>}
        </button>
    );
}

export default function Schedule() {
    const { offset: ctxOffset } = useAdminContext();
    const [offset, setOffset] = useState(ctxOffset);
    useEffect(() => { setOffset(ctxOffset); }, [ctxOffset]);
    const [selectedSession, setSelectedSession] = useState<SessionType | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [hourPx, setHourPx] = useState(HOUR_PX_DEFAULT);
    const [clickedTime, setClickedTime] = useState<{ start: string; end: string; date?: string } | undefined>();

    const handleGridClick = (e: React.MouseEvent<HTMLDivElement>, colOffset?: number) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const totalMins = Math.round((y / hourPx) * 60 / 15) * 15;
        const clampedMins = Math.max(0, Math.min(NUM_HOURS * 60 - 15, totalMins));
        const startH = START_HOUR + Math.floor(clampedMins / 60);
        const startM = clampedMins % 60;
        const endTotalMins = clampedMins + 60;
        const endH = START_HOUR + Math.floor(Math.min(endTotalMins, NUM_HOURS * 60) / 60);
        const endM = Math.min(endTotalMins, NUM_HOURS * 60) % 60;
        const pad = (n: number) => n.toString().padStart(2, '0');
        const clickedDate = colOffset !== undefined ? formatDay(getDate(colOffset)) : undefined;
        setClickedTime({ start: `${pad(startH)}:${pad(startM)}`, end: `${pad(endH)}:${pad(endM)}`, date: clickedDate });
        setShowAddModal(true);
    };

    const { data, error, loading, refetch } = useFetch<SessionType[]>('/api/sessions');

    const sessionsByDate = useMemo(
        () => (data ?? []).reduce<Record<string, SessionType[]>>((acc, s) => {
            const key = toDateKey(s.start_time);
            if (!acc[key]) acc[key] = [];
            acc[key].push(s);
            return acc;
        }, {}),
        [data]
    );

    const btnBase = "whitespace-nowrap inline-flex items-center justify-center font-didot text-[10px] tracking-[0.2em] uppercase bg-wood-accent text-white hover:bg-wood-dark shadow-sm hover:shadow-md transition-all duration-200 rounded-xl active:scale-95";
    const navBtn = "font-didot text-wood-accent/70 hover:text-wood-dark disabled:opacity-20 text-xl border bg-wood-light border-wood-accent/10 hover:bg-wood-accent/5 shadow-sm hover:shadow-md rounded-xl flex items-center justify-center leading-none transition-colors";

    return (
        <>
        <div className="flex flex-col flex-1 min-h-0">

            {/* ── Toolbar ── */}
            <div className="flex items-center gap-3 px-6 py-3 border-b border-wood-accent/10 bg-wood-light shrink-0">
                <button
                    onClick={() => setOffset(Math.max(-MAX_DAYS, offset - 1))}
                    disabled={offset <= -MAX_DAYS}
                    className={`${navBtn} w-10 h-10 shrink-0`}
                >‹</button>

                <div className="flex flex-1 gap-2">
                    <button onClick={() => setShowAddModal(true)} className={`${btnBase} flex-1 h-10 px-3`}>+ Session</button>
                    <button onClick={() => setOffset(0)}          className={`${btnBase} flex-1 h-10 px-3`}>Today</button>
                    <button
                        onClick={() => setHourPx(h => Math.max(HOUR_PX_MIN, h - HOUR_PX_STEP))}
                        disabled={hourPx <= HOUR_PX_MIN}
                        className={`${navBtn} w-10 h-10 shrink-0`}
                    >−</button>
                    <button
                        onClick={() => setHourPx(h => Math.min(HOUR_PX_MAX, h + HOUR_PX_STEP))}
                        disabled={hourPx >= HOUR_PX_MAX}
                        className={`${navBtn} w-10 h-10 shrink-0`}
                    >+</button>
                </div>

                <button
                    onClick={() => setOffset(Math.min(MAX_DAYS, offset + 1))}
                    disabled={offset >= MAX_DAYS}
                    className={`${navBtn} w-10 h-10 shrink-0`}
                >›</button>
            </div>

            {error && <p className="font-didot text-red-400 text-xs tracking-widest px-6 py-2 shrink-0">{error}</p>}

            {/* ── Single scrollable time grid ── */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">

                {/* Sticky day headers */}
                <div className="sticky top-0 z-10 flex bg-wood-light border-b border-wood-accent/10">
                    <div style={{ width: TIME_COL_W }} className="shrink-0" />
                    {/* mobile: 1 day */}
                    <div className="lg:hidden flex-1 px-3 py-2">
                        <p className="font-didot text-xs tracking-widest uppercase text-wood-dark">
                            {getDayLabel(getDate(offset))}
                        </p>
                        <p className="font-cormorant text-sm text-wood-accent/60">
                            {getDate(offset).toLocaleDateString('en-AU', { month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    {/* desktop: 5 days */}
                    <div className="hidden lg:grid flex-1 border-l border-wood-accent/10" style={{ gridTemplateColumns: `repeat(${DAYS_DESKTOP}, 1fr)` }}>
                        {Array.from({ length: DAYS_DESKTOP }, (_, i) => {
                            const d = getDate(offset + DAYS_OFFSET + i);
                            const isSelected = (offset + DAYS_OFFSET + i) === ctxOffset;
                            return (
                                <div key={i} className={`px-3 py-2 border-r border-wood-accent/10 ${isSelected ? 'bg-wood-accent/5' : ''}`}>
                                    <p className={`font-didot text-xs tracking-widest uppercase ${isSelected ? 'text-wood-accent' : 'text-wood-dark'}`}>{getDayLabel(d)}</p>
                                    <p className={`font-cormorant text-sm ${isSelected ? 'text-wood-accent' : 'text-wood-accent/60'}`}>
                                        {d.toLocaleDateString('en-AU', { month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Time grid */}
                <div className="flex select-none">

                    {/* Hour labels */}
                    <div className="shrink-0 relative" style={{ width: TIME_COL_W, height: NUM_HOURS * hourPx }}>
                        {HOURS.map((h, i) => (
                            <span
                                key={h}
                                className="absolute right-2 font-didot text-[10px] tracking-wide text-wood-accent/40"
                                style={{ top: i * hourPx - 7 }}
                            >
                                {hourLabel(h)}
                            </span>
                        ))}
                    </div>

                    {/* Grid body */}
                    <div className="flex-1 border-l border-wood-accent/10 relative" style={{ height: NUM_HOURS * hourPx }}>

                        {/* Hour lines */}
                        {HOURS.map((h, i) => (
                            <div
                                key={h}
                                className="absolute left-0 right-0 border-t border-wood-accent/10"
                                style={{ top: i * hourPx }}
                            />
                        ))}
                        {/* Bottom border */}
                        <div className="absolute left-0 right-0 border-t border-wood-accent/10" style={{ top: NUM_HOURS * hourPx }} />

                        {/* Mobile: 1 day column */}
                        <div className="lg:hidden absolute inset-0 cursor-pointer" onClick={e => handleGridClick(e)}>
                            {loading && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <p className="font-didot text-xs text-wood-accent/40 tracking-widest">Loading…</p>
                                </div>
                            )}
                            {layoutSessions(sessionsByDate[toDateKey(getDate(offset))] ?? []).map(({ session, col, totalCols }) => {
                                const s = sessionStyle(session, hourPx);
                                if (!s) return null;
                                return <SessionCard key={session.id} session={session} style={s} col={col} totalCols={totalCols} onClick={() => setSelectedSession(session)} />;
                            })}
                        </div>

                        {/* Desktop: 5 day columns */}
                        <div className="hidden lg:grid absolute inset-0" style={{ gridTemplateColumns: `repeat(${DAYS_DESKTOP}, 1fr)` }}>
                            {Array.from({ length: DAYS_DESKTOP }, (_, i) => {
                                const date = getDate(offset + DAYS_OFFSET + i);
                                const sessions = sessionsByDate[toDateKey(date)] ?? [];
                                const isSelected = (offset + DAYS_OFFSET + i) === ctxOffset;
                                return (
                                    <div key={i} className={`relative border-r border-wood-accent/10 cursor-pointer ${isSelected ? 'bg-wood-accent/5' : ''}`} onClick={e => handleGridClick(e, offset + DAYS_OFFSET + i)}>
                                        {loading && i === 0 && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <p className="font-didot text-xs text-wood-accent/40 tracking-widest">Loading…</p>
                                            </div>
                                        )}
                                        {layoutSessions(sessions).map(({ session, col, totalCols }) => {
                                            const s = sessionStyle(session, hourPx);
                                            if (!s) return null;
                                            return <SessionCard key={session.id} session={session} style={s} col={col} totalCols={totalCols} onClick={() => setSelectedSession(session)} />;
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {selectedSession && (
            <div className="lg:bg-black/40 fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0" onClick={() => setSelectedSession(null)} />
                <div className="relative w-full max-w-lg mx-4 h-[85dvh]">
                    <SessionModal
                        session={selectedSession}
                        onClose={() => setSelectedSession(null)}
                        onUpdated={refetch}
                        onDeleted={() => { setSelectedSession(null); refetch(); }}
                    />
                </div>
            </div>
        )}

        {showAddModal && (
            <AddSessionModal
                onClose={() => { setShowAddModal(false); setClickedTime(undefined); }}
                onCreated={refetch}
                initialStartTime={clickedTime?.start}
                initialEndTime={clickedTime?.end}
                initialDate={clickedTime?.date}
            />
        )}
        </>
    );
}