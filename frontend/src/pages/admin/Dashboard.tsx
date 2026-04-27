import { useState, useEffect } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { useAdminContext } from '../../layouts/AdminLayout';
import { formatDate, formatTime, toDateKey } from '../../utils/dateUtils'

import type { SessionType } from '../../types/session';

import AddSessionModal from '../../components/admin/modals/AddSessionModal';
import SessionModal from '../../components/admin/modals/SessionModal';


function formatDuration(start: Date, end: Date): string {
    const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    return `${mins} mins`;
}

function flowsForDate(flows: SessionType[], date: Date) {
    const key = toDateKey(date);
    return flows.filter(f => toDateKey(new Date(f.start_time)) === key);
}

export default function Dashboard() {
    const { selectedDate, offset, setOffset } = useAdminContext();
    const { data: flows, loading, error, refetch } = useFetch<SessionType[]>('/api/sessions');
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedSession, setSelectedSession] = useState<SessionType | null>(null);

    useEffect(() => {
        const id = setInterval(refetch, 30_000);
        const onVisible = () => { if (document.visibilityState === 'visible') refetch(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
    }, [refetch]);

    const sessions = flows ? flowsForDate(flows, selectedDate) : [];
    const totalCapacity = sessions.reduce((s, f) => s + f.capacity, 0);
    const totalBooked = sessions.reduce((s, f) => s + (f.capacity - f.spots_remaining), 0);
    const totalRemaining = sessions.reduce((s, f) => s + f.spots_remaining, 0);

    return (
        <>
        <div className="relative flex flex-col md:flex-row gap-6 p-6 min-h-screen md:min-h-0 md:h-full md:overflow-hidden bg-wood-dark/5" onClick={() => setSelectedSession(null)}>

            {/* Left — Today's Sessions */}
            <section className="w-full md:w-5/12 shrink-0 flex flex-col md:min-h-0">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col items-start gap-2">
                        <h2 className="font-cormorant text-2xl text-wood-dark">
                            {offset === 0 ? "Today's Sessions" : offset === 1 ? "Tomorrow's Sessions" : `${formatDate(selectedDate)}'s Sessions`}
                        </h2>
                    </div>
                    <div className='flex flex-row gap-2'>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex-1 whitespace-nowrap inline-flex items-center justify-center font-didot text-[10px] tracking-[0.2em] uppercase bg-wood-accent text-white hover:bg-wood-dark shadow-sm hover:shadow-md transition-all duration-200 py-3 px-4 rounded-xl active:scale-95"
                        >
                            + SESSION
                        </button>
                    </div>
                </div>
                <div className="py-6 flex flex-row justify-between gap-2">
                    <button onClick={() => setOffset(offset - 1)} className="flex-1 border border-color-wood-accent px-1 rounded-lg text-4xl font-didot text-wood-accent/50 hover:text-wood-dark shadow-sm hover:shadow-md transition-colors duration-200 leading-none">←</button>
                    <button 
                        onClick={() => setOffset(0)} 
                        className="flex-1 whitespace-nowrap inline-flex items-center justify-center font-didot text-[10px] tracking-[0.2em] uppercase bg-wood-accent text-white hover:bg-wood-dark shadow-sm hover:shadow-md transition-all duration-200 py-3 px-6 rounded-xl active:scale-95"
                    >
                        Today
                    </button>
                    <button onClick={() => setOffset(offset + 1)} className="flex-1 border border-color-wood-accent px-1 rounded-lg text-4xl font-didot text-wood-accent/50 hover:text-wood-dark shadow-sm hover:shadow-md transition-colors duration-200 leading-none">→</button>
                </div>

                {loading && <p className="font-didot text-sm text-wood-accent/50">Loading...</p>}
                {error && <p className="font-didot text-sm text-red-400">Failed to load sessions.</p>}

                {!loading && !error && sessions.length === 0 && (
                    <p className="font-didot text-sm text-wood-accent/50">No sessions today.</p>
                )}

                <div className="flex flex-col gap-4 max-w-2xl md:overflow-y-auto md:flex-1 no-scrollbar">
                    {sessions.map(f => {
                        const booked = f.capacity - f.spots_remaining;
                        const isPast = new Date(f.start_time) <= new Date();
                        return (
                            <button
                                key={f.id}
                                onClick={e => { e.stopPropagation(); setSelectedSession(s => s?.id === f.id ? null : f); }}
                                className={`flex items-center justify-between gap-2 py-4 px-4 text-left border rounded-xl transition-colors duration-200 group ${isPast ? 'opacity-40' : ''} ${selectedSession?.id === f.id ? 'bg-wood-accent/10 border-wood-accent/40 shadow-md' : 'bg-wood-light border-wood-accent/10 hover:bg-wood-accent/5 shadow-sm hover:shadow-md'}`}
                            >
                                <div className="shrink-0 min-w-0">
                                    <p className="font-cormorant text-xl text-wood-dark leading-tight whitespace-nowrap">{formatTime(f.start_time)}</p>
                                    <p className="font-didot text-xs text-wood-accent/60 whitespace-nowrap">{formatDuration(f.start_time, f.end_time)}</p>
                                </div>
                                <div className="flex-1 min-w-0 px-3">
                                    <p className="font-cormorant text-lg text-wood-dark truncate">{f.method_name ?? '—'}</p>
                                    <p className="font-didot text-xs text-wood-accent/60 truncate">{f.instructor ?? '—'}</p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <div className="text-right text-sm whitespace-nowrap">
                                        <span className={booked === f.capacity ? 'text-red-500' : 'text-emerald-600'}>{booked}</span>
                                        <span className="text-wood-accent/40 font-medium"> / {f.capacity}</span>
                                    </div>
                                    <svg className="w-4 h-4 text-wood-accent/30 group-hover:text-wood-accent shrink-0 transition-colors duration-200" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 1l6 6-6 6" />
                                    </svg>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* Right — Summary or Session Panel */}
            <aside className="w-full flex-1 min-w-0 flex flex-col md:overflow-hidden" onClick={e => e.stopPropagation()}>
                {selectedSession ? (
                    <SessionModal
                        session={selectedSession}
                        onClose={() => setSelectedSession(null)}
                        onUpdated={refetch}
                        onDeleted={() => { setSelectedSession(null); refetch(); }}
                    />
                ) : (
                    <>
                        <h2 className="font-cormorant text-2xl text-wood-dark mb-4">Summary</h2>
                        <div className="flex flex-col gap-3">
                            <SummaryCard label="Sessions" value={sessions.length.toString()} />
                            <SummaryCard label="Total Booked" value={`${totalBooked} / ${totalCapacity}`} />
                            <SummaryCard label="Spots Remaining" value={totalRemaining.toString()} />
                            <SummaryCard label="Fill Rate" value={totalCapacity > 0 ? `${Math.round((totalBooked / totalCapacity) * 100)}%` : '—'} />
                        </div>
                    </>
                )}
            </aside>
        </div>

        {showAddModal && (
            <AddSessionModal
                onClose={() => setShowAddModal(false)}
                onCreated={refetch}
            />
        )}
        </>
    );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="border border-wood-accent/20 rounded p-4">
            <p className="font-didot text-xs text-wood-accent/60 tracking-wide mb-1">{label}</p>
            <p className="font-cormorant text-3xl text-wood-dark">{value}</p>
        </div>
    );
}