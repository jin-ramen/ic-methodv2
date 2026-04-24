import { useState, useEffect, useMemo } from 'react'

import { useFetch } from '../../utils/useFetch'
import { useAdminContext } from '../../layouts/AdminLayout'
import { toDateKey, getDate } from '../../utils/dateUtils'

import type { SessionType } from '../../types/SessionType'

import DayHeader from '../../components/DayHeader'
import DayContent from '../../components/DayContent'

import SessionModal from '../../components/admin/modal/SessionModal'
import AddSessionModal from '../../components/admin/modal/AddSessionModal';

const MAX_DAYS = 90;

export default function Schedule() {
    const { offset, setOffset } = useAdminContext();
    const [calHeight, setCalHeight] = useState<string>('auto');
    const [selectedSession, setSelectedSession] = useState<SessionType | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    const { data, error, loading, refetch } = useFetch<SessionType[]>('/api/sessions');

    useEffect(() => {
        const body = document.body;
        const prevBodyOverflow = body.style.overflow;
        body.style.overflow = 'hidden';

        const header = document.querySelector('header');

        const measure = () => {
            const h = header?.getBoundingClientRect().height ?? 0;
            setCalHeight(`calc(100dvh - ${h}px)`);
        };

        measure();
        window.addEventListener('resize', measure);
        return () => {
            window.removeEventListener('resize', measure);
            body.style.overflow = prevBodyOverflow;
        };
    }, []);

    const SessionsByDate = useMemo(
        () => (data ?? []).reduce<Record<string, SessionType[]>>((acc, session) => {
            const key = toDateKey(session.start_time);
            if (!acc[key]) acc[key] = [];
            acc[key].push(session);
            return acc;
        }, {}),
        [data]
    );

    return (
        <>
        <div
            className="cal flex flex-col overflow-hidden"
            style={{ height: calHeight }}
        >
            <div className="flex-1 min-h-0 flex flex-col px-6 py-6 md:px-10 md:py-5 overflow-hidden bg-wood-dark/5">

                {error && <p className="font-didot text-red-400 text-xs tracking-widest shrink-0">{error}</p>}

                {/* Mobile: single day */}
                <div className="lg:hidden flex flex-col flex-1 overflow-hidden">
                    <DayHeader date={getDate(offset)} index={0} variant="light" />
                    <div className="flex-1 overflow-y-auto no-scrollbar mt-3">
                        <DayContent
                            flows={SessionsByDate[toDateKey(getDate(offset))] ?? []}
                            onSelect={setSelectedSession}
                            index={0}
                            loading={loading}
                            variant="light"
                        />
                    </div>
                    
                    <div className="flex items-center justify-between mt-6 shrink-0 gap-3">
                        <button
                            onClick={() => setOffset(Math.max(-MAX_DAYS, offset - 1))}
                            disabled={offset <= -MAX_DAYS}
                            className="font-didot text-wood-accent/70 hover:text-wood-dark disabled:opacity-20 text-xl border bg-wood-light border-wood-accent/10 hover:bg-wood-accent/5 shadow-sm hover:shadow-md rounded-xl disabled:hover:border-wood-accent/30 w-12 h-12 flex items-center justify-center leading-none transition-colors shrink-0"
                        >
                            ‹
                        </button>

                        {/* New middle section with both buttons */}
                        <div className="flex flex-1 gap-2">
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex-1 whitespace-nowrap inline-flex items-center justify-center gap-2 font-didot text-[10px] tracking-[0.2em] uppercase bg-wood-accent text-white hover:bg-wood-dark shadow-sm hover:shadow-md transition-all duration-300 h-12 px-2 rounded-xl active:scale-95"
                            >
                                + Session
                            </button>
                            <button
                                onClick={() => setOffset(0)}
                                className="flex-1 whitespace-nowrap inline-flex items-center justify-center font-didot text-[10px] tracking-[0.2em] uppercase bg-wood-accent text-white hover:bg-wood-dark shadow-sm hover:shadow-md transition-all duration-300 h-12 px-2 rounded-xl active:scale-95"
                            >
                                Today
                            </button>
                        </div>

                        <button
                            onClick={() => setOffset(Math.min(MAX_DAYS, offset + 1))}
                            disabled={offset >= MAX_DAYS}
                            className="font-didot text-wood-accent/70 hover:text-wood-dark disabled:opacity-20 text-xl border bg-wood-light border-wood-accent/10 hover:bg-wood-accent/5 shadow-sm hover:shadow-md rounded-xl disabled:hover:border-wood-accent/30 w-12 h-12 flex items-center justify-center leading-none transition-colors shrink-0"
                        >
                            ›
                        </button>
                    </div>
                </div>


                {/* Desktop: 5-day view */}
                <div className="hidden lg:flex flex-col flex-1 overflow-hidden">
                    <div className="flex justify-between mb-6 shrink-0 pb-3">
                        <button
                            onClick={() => setOffset(Math.max(-MAX_DAYS, offset - 1))}
                            disabled={offset <= -MAX_DAYS}
                            className="font-didot text-wood-accent/70 hover:text-wood-dark disabled:opacity-20 text-xl border bg-wood-light border-wood-accent/10 hover:bg-wood-accent/5 shadow-sm hover:shadow-md rounded-xl disabled:hover:border-wood-accent/30 py-3 px-6 flex items-center justify-center leading-none transition-colors"
                        >
                            ‹
                        </button>
                        
                        {/* Added flex-1 and w-full here to ensure this container fills the space between the arrows */}
                        <div className='flex flex-row gap-4 flex-1 mx-4'>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex-1 whitespace-nowrap inline-flex items-center justify-center gap-2 font-didot text-[10px] tracking-[0.2em] uppercase bg-wood-accent text-white hover:bg-wood-dark shadow-sm hover:shadow-md transition-all duration-300 py-3 px-6 rounded-xl active:scale-95"
                            >
                                + Session
                            </button>
                            
                            <button 
                                onClick={() => setOffset(0)} 
                                className="flex-1 whitespace-nowrap inline-flex items-center justify-center font-didot text-[10px] tracking-[0.2em] uppercase bg-wood-accent text-white hover:bg-wood-dark shadow-sm hover:shadow-md transition-all duration-200 py-3 px-6 rounded-xl active:scale-95"
                            >
                                Today
                            </button>
                            <button
                                // onClick={() -> setShowRuleModa(true)} TODO test
                                className="flex-1 whitespace-nowrap inline-flex items-center justify-center font-didot text-[10px] tracking-[0.2em] uppercase bg-wood-accent text-white hover:bg-wood-dark shadow-sm hover:shadow-md transition-all duration-200 py-3 px-6 rounded-xl active:scale-95"
                            >
                                + Rule
                            </button>
                        </div>

                        <button
                            onClick={() => setOffset(Math.min(MAX_DAYS, offset + 1))}
                            disabled={offset >= MAX_DAYS}
                            className="font-didot text-wood-accent/70 hover:text-wood-dark disabled:opacity-20 text-xl border bg-wood-light border-wood-accent/10 hover:bg-wood-accent/5 shadow-sm hover:shadow-md rounded-xl disabled:hover:border-wood-accent/30 py-3 px-6 flex items-center justify-center leading-none transition-colors"
                        >
                            ›
                        </button>
                    </div>
                    <div className="grid grid-cols-5 gap-6 shrink-0 mb-3">
                        {Array.from({ length: 5 }, (_, i) => (
                            <DayHeader key={i} date={getDate(offset + i)} index={i} variant="light" />
                        ))}
                    </div>
                    <div className="grid grid-cols-5 gap-6 flex-1 min-h-0">
                        {Array.from({ length: 5 }, (_, i) => {
                            const date = getDate(offset + i);
                            return (
                                <div key={i} className="overflow-y-auto no-scrollbar min-h-0">
                                    <DayContent
                                        flows={SessionsByDate[toDateKey(date)] ?? []}
                                        onSelect={setSelectedSession}
                                        index={i}
                                        loading={loading}
                                        variant="light"
                                    />
                                </div>
                            );
                        })}
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
                onClose={() => setShowAddModal(false)}
                onCreated={refetch}
            />
        )}
        </>
    );
}