import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useFetch } from '../../utils/useFetch';
import type { FlowType } from '../../types/flow';
import type { AdminContext } from '../../layouts/AdminLayout';
import AddSessionModal from '../../components/admin/AddSessionModal';
import SessionPanel from '../../components/admin/SessionPanel';

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDuration(start: string, end: string) {
    const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    return mins >= 60 ? `${Math.floor(mins / 60)} hrs ${mins % 60 ? ` ${mins % 60}m` : ''}` : `${mins} mins`;
}

function flowsForDate(flows: FlowType[], date: Date) {
    return flows.filter(f => {
        const d = new Date(f.start_time);
        return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate();
    });
}

export default function Dashboard() {
    const { selectedDate, offset, setOffset } = useOutletContext<AdminContext>();
    const { data: flows, loading, error, refetch } = useFetch<FlowType[]>('/api/flows');
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedSession, setSelectedSession] = useState<FlowType | null>(null);

    const todayStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    const dateLabel = selectedDate.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const sessions = flows ? flowsForDate(flows, selectedDate) : [];
    const totalCapacity = sessions.reduce((s, f) => s + f.capacity, 0);
    const totalBooked = sessions.reduce((s, f) => s + (f.capacity - f.spots_remaining), 0);
    const totalRemaining = sessions.reduce((s, f) => s + f.spots_remaining, 0);

    return (
        <>
        <div className="relative flex flex-col md:flex-row gap-6 p-6 min-h-screen md:min-h-0 md:h-full md:overflow-hidden bg-wood-dark/5" onClick={() => setSelectedSession(null)}>

            {/* Left — Today's Flows */}
            <section className="w-full md:w-5/12 shrink-0 flex flex-col md:min-h-0">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col items-start gap-2">
                        <h2 className="font-cormorant text-2xl text-wood-dark">Today's Flows</h2>
                        <div className="flex items-center gap-2">
                            <p className="font-didot text-xs text-wood-accent/60 tracking-wide">{dateLabel}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center gap-2 font-didot text-[10px] tracking-[0.2em] uppercase bg-wood-accent text-white hover:bg-wood-dark shadow-sm hover:shadow-md transition-all duration-300 py-3 px-6 rounded-xl active:scale-95"
                    >
                        + Add Session
                    </button>
                </div>
                <div className="py-6 flex flex-row justify-between">
                    <button onClick={() => setOffset(offset - 1)} className="border border-color-wood-accent px-1 rounded-lg text-4xl font-didot text-wood-accent/50 hover:text-wood-dark shadow-sm hover:shadow-md transition-colors duration-200 leading-none">←</button>
                    <button 
                        onClick={() => setOffset(0)} 
                        className="flex-initial inline-flex items-center justify-center font-didot text-[10px] tracking-[0.2em] uppercase bg-wood-accent text-white hover:bg-wood-dark shadow-sm hover:shadow-md transition-all duration-200 py-3 px-6 rounded-xl active:scale-95"
                    >
                        Today
                    </button>
                    <button onClick={() => setOffset(offset + 1)} className="border border-color-wood-accent px-1 rounded-lg text-4xl font-didot text-wood-accent/50 hover:text-wood-dark shadow-sm hover:shadow-md transition-colors duration-200 leading-none">→</button>
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
                    <SessionPanel
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
                defaultDate={todayStr}
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