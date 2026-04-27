import type { SessionType } from '../../types/session'
import { formatTime } from '../../utils/dateUtils'

type Props = {
    flows: SessionType[];
    onSelect: (f: SessionType) => void;
    index?: number;
    loading?: boolean;
    variant?: 'dark' | 'light';
    animate?: boolean;
}

type Period = 'Morning' | 'Afternoon' | 'Evening'

function getPeriod(iso: Date): Period {
    const hour = new Date(iso).getHours();
    if (hour < 12) return 'Morning';
    if (hour < 15) return 'Afternoon';
    return 'Evening';
}

const PERIODS: Period[] = ['Morning', 'Afternoon', 'Evening'];

export default function DayContent({ flows, onSelect, index = 0, loading = false, variant = 'dark', animate = true }: Props) {
    const now = new Date();
    const sorted = [...flows]
        .filter(f => variant === 'light' || new Date(f.start_time) > now)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const grouped = PERIODS.reduce<Record<Period, SessionType[]>>((acc, p) => {
        acc[p] = sorted.filter(f => getPeriod(f.start_time) === p);
        return acc;
    }, { Morning: [], Afternoon: [], Evening: [] });

    const hasAny = sorted.length > 0;

    const t = {
        skeleton:    variant === 'light' ? 'bg-wood-accent/10 border-wood-accent/10'     : 'bg-wood-dark/20 border-wood-text/5',
        empty:       variant === 'light' ? 'text-wood-accent/40'                          : 'text-wood-text/30',
        period:      variant === 'light' ? 'text-wood-accent/50'                          : 'text-wood-text/30',
        cardOk:      variant === 'light' ? 'bg-wood-light border-wood-accent/10 hover:bg-wood-accent/5 shadow-sm hover:shadow-md rounded-xl' : 'bg-wood-dark/40 border-wood-text/10 hover:border-wood-text/40 hover:bg-wood-dark/60',
        cardFull:    variant === 'light' ? 'bg-wood-light border-wood-accent/5 shadow-sm rounded-xl cursor-not-allowed'                   : 'bg-wood-dark/20 border-wood-text/5 cursor-not-allowed',
        nameOk:      variant === 'light' ? 'text-wood-dark'                               : 'text-wood-text',
        nameFull:    variant === 'light' ? 'text-wood-accent/30'                          : 'text-wood-text/30',
        instructor:  variant === 'light' ? 'text-wood-accent/60'                          : 'text-wood-text/30',
        spots:       variant === 'light' ? 'text-wood-accent/60'                          : 'text-wood-text/30',
        timeOk:      variant === 'light' ? 'text-wood-dark'                               : 'text-wood-text',
        timeFull:    variant === 'light' ? 'text-wood-accent/30'                          : 'text-wood-text/30',
        timeEnd:     variant === 'light' ? 'text-wood-accent/50'                          : 'text-wood-text/30',
    };

    if (loading) {
        return (
            <div className="flex flex-col gap-3">
                {[...Array(2)].map((_, i) => (
                    <div
                        key={i}
                        className={`p-3 py-6 border ${variant === 'dark' ? 'animate-pulse' : ''} ${t.skeleton}`}
                        style={{ animationDelay: `${i * 0.1}s` }}
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {!hasAny ? (
                <p
                    className={`font-didot text-xs tracking-widest ${variant === 'dark' && animate ? 'opacity-0 animate-text-in' : ''} ${t.empty}`}
                    style={{ animationDelay: `${(index * 4 / 100).toFixed(2)}s` }}
                >
                    No sessions
                </p>
            ) : (
                PERIODS.filter(p => grouped[p].length > 0).map(period => (
                    <div key={period}>
                        <p className={`font-didot text-xs tracking-widest uppercase mb-2 ${variant === 'dark' && animate ? 'opacity-0 animate-text-in' : ''} ${t.period}`}
                            style={{ animationDelay: `${(index * 4 / 100).toFixed(2)}s` }}
                        >
                            {period}
                        </p>
                        <div className="flex flex-col gap-3">
                            {grouped[period].map((flow, i) => {
                                const fullyBooked = flow.spots_remaining === 0;
                                const isPast = new Date(flow.start_time) <= now;
                                return (
                                <div
                                    key={flow.id}
                                    className={`${variant === 'dark' && animate ? 'opacity-0 animate-text-in' : ''} ${isPast ? '[&>button]:opacity-40' : ''}`}
                                    style={{ animationDelay: `${((index * 4 + i * 3) / 100).toFixed(2)}s` }}
                                >
                                <button
                                    onClick={() => onSelect(flow)}
                                    disabled={fullyBooked}
                                    className={`flow w-full text-left p-3 border py-6 transition-all duration-200 ${fullyBooked ? t.cardFull : t.cardOk}`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className={`font-didot text-sm tracking-widest uppercase ${fullyBooked ? t.nameFull : t.nameOk}`}>
                                                {flow.method_name ?? 'Method'}
                                            </p>
                                            {flow.instructor && (
                                                <p className={`font-didot text-xs tracking-widest mt-1 ${t.instructor}`}>{flow.instructor}</p>
                                            )}
                                            <p className={`font-didot text-xs mt-1 ${fullyBooked ? 'text-rose-400/60' : t.spots}`}>
                                                {fullyBooked ? 'Fully Booked' : `${flow.spots_remaining} spot${flow.spots_remaining !== 1 ? 's' : ''}`}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className={`font-cormorant text-lg leading-tight ${fullyBooked ? t.timeFull : t.timeOk}`}>
                                                {formatTime(flow.start_time)}
                                            </p>
                                            <p className={`font-cormorant text-sm ${t.timeEnd}`}>
                                                – {formatTime(flow.end_time)}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                                </div>
                                );
                            })}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}