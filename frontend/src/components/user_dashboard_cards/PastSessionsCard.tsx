type UserBooking = {
    id: string;
    session_start: string | null;
    session_end: string | null;
    session_instructor: string | null;
    session_method_name: string | null;
    status: string;
    cancelled_at: string | null;
    cancellation_type: string | null;
};

function TimeGlow({ date }: { date: Date }) {
    const now = new Date();
    const diffDays = Math.round((now.getTime() - date.getTime()) / 86_400_000);
    
    // Each past session is a tiny fading ember — the older, the softer
    let size: number;
    let opacity: number;
    
    if (diffDays <= 1) {
        size = 3;
        opacity = 0.5;
    } else if (diffDays <= 3) {
        size = 2.5;
        opacity = 0.35;
    } else if (diffDays <= 7) {
        size = 2;
        opacity = 0.25;
    } else if (diffDays <= 14) {
        size = 1.5;
        opacity = 0.15;
    } else {
        size = 1;
        opacity = 0.08;
    }
    
    return (
        <span
            className="block rounded-full bg-wood-accent shrink-0"
            style={{
                width: `${size}px`,
                height: `${size}px`,
                opacity,
                boxShadow: `0 0 ${size * 2}px currentColor`,
            }}
        />
    );
}

export function PastSessionsCard({ bookings }: { bookings: UserBooking[] }) {
    const now = new Date();
    const past = bookings
        .filter(b => b.session_start && new Date(b.session_start) <= now && b.status !== 'cancelled')
        .sort((a, b) => new Date(b.session_start!).getTime() - new Date(a.session_start!).getTime())
        .slice(0, 8);

    if (past.length === 0) return null;

    return (
        <div className="rounded-2xl border border-wood-text/5 bg-wood-accent/10 px-6 py-6 flex flex-col gap-4
                        transition-all duration-700 hover:bg-wood-accent/10 hover:border-wood-text/10">
            
            {/* Label */}
            <div className="flex items-center gap-2">
                <p className="font-didot text-[10px] tracking-[0.35em] uppercase text-wood-accent">
                    Past Sessions
                </p>
            </div>

            {/* Sessions list */}
            <div className="flex flex-col">
                {past.map((b, _) => {
                    const date = new Date(b.session_start!);
                    const month = date.toLocaleDateString('en-US', { month: 'short' });
                    const day = date.getDate();
                    const method = b.session_method_name;
                    const instructor = b.session_instructor;
                    
                    return (
                        <div
                            key={b.id}
                            className="flex items-center gap-4 py-3 -mx-6 px-6 group
                                       border-b border-wood-accent/5 last:border-0
                                       hover:bg-wood-accent/5 transition-all duration-500"
                        >
                            {/* Glowing ember — fades as sessions age */}
                            <TimeGlow date={date} />
                            
                            {/* Date — two‑line stack for elegance */}
                            <div className="flex flex-col items-center shrink-0 w-9 gap-1">
                                <span className="font-cormorant text-lg text-wood-accent/70 leading-none">
                                    {day}
                                </span>
                                <span className="font-didot text-[8px] tracking-[0.25em] uppercase text-wood-accent/65 leading-none mt-0.5">
                                    {month}
                                </span>
                            </div>

                            {/* Class name + instructor */}
                            <div className="flex flex-col min-w-0 flex-1">
                                <span className="font-cormorant text-lg text-wood-accent/70 group-hover:text-wood-accent/90 leading-snug transition-colors duration-500">
                                    {method ?? 'Class'}
                                </span>
                                {instructor && (
                                    <span className="font-didot text-[9px] tracking-[0.2em] uppercase text-wood-accent/60 group-hover:text-wood-accent/70 transition-colors duration-500 mt-0.5">
                                        {instructor}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Bottom whisper — how many sessions */}
            <div className="flex items-center justify-between mt-1 pt-3 border-t border-wood-accent/40">
                <p className="font-didot text-[8px] tracking-[0.3em] uppercase text-wood-accent/50">
                    {past.length} session{past.length !== 1 ? 's' : ''}
                </p>
                <span className="font-didot text-[8px] tracking-[0.3em] uppercase text-wood-accent/45">
                    archive
                </span>
            </div>
        </div>
    );
}