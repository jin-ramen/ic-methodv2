import type { FlowType } from '../types/flow'
import { formatTime } from '../utils/dateUtils'

type Props = {
    flows: FlowType[];
    onSelect: (f: FlowType) => void;
    index?: number;
    loading?: boolean;
}

type Period = 'Morning' | 'Afternoon' | 'Evening'

function getPeriod(isoString: string): Period {
    const hour = new Date(isoString).getHours();
    if (hour < 12) return 'Morning';
    if (hour < 15) return 'Afternoon';
    return 'Evening';
}

const PERIODS: Period[] = ['Morning', 'Afternoon', 'Evening'];

export default function DayContent({ flows, onSelect, index = 0, loading = false }: Props) {
    const now = new Date();
    const sorted = [...flows]
        .filter(f => new Date(f.start_time) > now)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const grouped = PERIODS.reduce<Record<Period, FlowType[]>>((acc, p) => {
        acc[p] = sorted.filter(f => getPeriod(f.start_time) === p);
        return acc;
    }, { Morning: [], Afternoon: [], Evening: [] });

    const hasAny = sorted.length > 0;

    if (loading) {
        return (
            <div className="flex flex-col gap-3">
                {[...Array(2)].map((_, i) => (
                    <div
                        key={i}
                        className="p-3 py-6 bg-wood-dark/20 border border-wood-text/5 animate-pulse"
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
                    className="font-didot text-wood-text/30 text-xs tracking-widest opacity-0 animate-text-intro"
                    style={{ animationDelay: `${index * 0.04}s` }}
                >
                    No sessions
                </p>
            ) : (
                PERIODS.filter(p => grouped[p].length > 0).map(period => (
                    <div key={period}>
                        <p className="font-didot text-wood-text/30 text-xs tracking-widest uppercase mb-2 opacity-0 animate-text-intro"
                            style={{ animationDelay: `${index * 0.04}s` }}
                        >
                            {period}
                        </p>
                        <div className="flex flex-col gap-3">
                            {grouped[period].map((flow, i) => {
                                const fullyBooked = flow.spots_remaining === 0;
                                return (
                                <button
                                    key={flow.id}
                                    onClick={() => !fullyBooked && onSelect(flow)}
                                    disabled={fullyBooked}
                                    className={`flow text-left p-3 border py-6 transition-all duration-200 opacity-0 animate-text-intro ${
                                        fullyBooked
                                            ? 'bg-wood-dark/20 border-wood-text/5 cursor-not-allowed'
                                            : 'bg-wood-dark/40 border-wood-text/10 hover:border-wood-text/40 hover:bg-wood-dark/60'
                                    }`}
                                    style={{ animationDelay: `${(index * 0.04) + (i * 0.03)}s` }}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className={`font-didot text-sm tracking-widest uppercase ${fullyBooked ? 'text-wood-text/30' : 'text-wood-text'}`}>
                                                {flow.method_name ?? 'Method'}
                                            </p>
                                            {flow.instructor && (
                                                <p className="font-didot text-wood-text/30 text-xs tracking-widest mt-1">{flow.instructor}</p>
                                            )}
                                            <p className={`font-didot text-xs mt-1 ${fullyBooked ? 'text-rose-400/60' : 'text-wood-text/30'}`}>
                                                {fullyBooked ? 'Fuly Commited' : `${flow.spots_remaining} spot${flow.spots_remaining !== 1 ? 's' : ''}`}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className={`font-cormorant text-lg leading-tight ${fullyBooked ? 'text-wood-text/30' : 'text-wood-text'}`}>
                                                {formatTime(flow.start_time)}
                                            </p>
                                            <p className="font-cormorant text-wood-text/30 text-sm">
                                                – {formatTime(flow.end_time)}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                                );
                            })}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
