import type { FlowType } from '../types/flow'
import { formatTime } from '../utils/dateUtils'

type Props = {
    flows: FlowType[];
    onSelect: (f: FlowType) => void;
    index?: number;
}

export default function DayContent({ flows, onSelect, index = 0 }: Props) {
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
