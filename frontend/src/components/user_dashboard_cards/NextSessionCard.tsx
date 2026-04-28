import { formatTime, formatDate } from '../../utils/dateUtils';

type Booking = {
    id: string;
    session_start: string | null;
    session_end: string | null;
    session_instructor: string | null;
    session_method_name: string | null;
};

function WhenLabel({ start }: { start: string }) {
    const date = new Date(start);
    const today = new Date();
    const diffDays = Math.round((date.getTime() - today.getTime()) / 86_400_000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return formatDate(date);
}

function TimeMoon({ start }: { start: string }) {
    const diff = Math.round((new Date(start).getTime() - Date.now()) / 3_600_000);
    
    let fullness: number;
    let descriptor: string;
    
    if (diff <= 0) {
        fullness = 1;
        descriptor = 'Now';
    } else if (diff < 1) {
        fullness = 0.95;
        descriptor = 'Soon';
    } else if (diff <= 6) {
        fullness = 0.75;
        descriptor = 'Today';
    } else if (diff <= 24) {
        fullness = 0.5;
        descriptor = 'Tomorrow';
    } else if (diff <= 48) {
        fullness = 0.3;
        descriptor = 'Ahead';
    } else {
        fullness = 0.1;
        descriptor = 'Ahead';
    }
    
    const circumference = 2 * Math.PI * 28;
    const dashOffset = circumference * (1 - fullness);
    
    return (
        <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
            <svg width="64" height="64" viewBox="0 0 64 64" className="absolute inset-0">
                <circle
                    cx="32" cy="32" r="28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.6"
                    className="text-wood-accent/10"
                />
                <circle
                    cx="32" cy="32" r="28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    className="text-wood-accent/50"
                    style={{
                        strokeDasharray: circumference,
                        strokeDashoffset: dashOffset,
                        transform: 'rotate(-90deg)',
                        transformOrigin: 'center',
                        transition: 'stroke-dashoffset 1.4s cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                />
            </svg>
            <span className="font-didot text-[7px] tracking-[0.3em] uppercase text-wood-accent/65 z-10">
                {descriptor}
            </span>
        </div>
    );
}

export function NextSessionCard({ booking }: { booking: Booking }) {
    if (!booking.session_start) return null;

    const start = new Date(booking.session_start);

    return (
        <div
            className="rounded-2xl border border-wood-text/5 bg-wood-accent/10 px-6 py-5
                        transition-all duration-700 hover:bg-wood-accent/10 hover:border-wood-text/10 group"
        >
            {/* Label + dot */}
            <div className="flex items-center gap-2 mb-2">
                <span className="block w-1 h-1 rounded-full bg-wood-accent/40" />
                <p className="font-didot text-[10px] tracking-[0.35em] uppercase text-wood-accent">
                    next session
                </p>
            </div>

            {/* Main row: information on the left, moon on the right */}
            <div className="flex items-start justify-between gap-4">
                {/* Left: all text information */}
                <div className="flex flex-col gap-1 min-w-0">
                    <p className="font-cormorant text-3xl text-wood-accent leading-tight">
                        <WhenLabel start={booking.session_start} />
                        <span className="text-wood-accent/60 mx-2">·</span>
                        {booking.session_method_name ?? 'Class'}
                    </p>
                    <p className="font-didot text-xs text-wood-accent/50 tracking-wide">
                        {formatTime(start).toLowerCase()}
                        {booking.session_end
                            ? ` – ${formatTime(new Date(booking.session_end)).toLowerCase()}`
                            : ''}
                    </p>
                    {booking.session_instructor && (
                        <p className="font-didot text-[9px] tracking-[0.3em] uppercase text-wood-accent/50">
                            with {booking.session_instructor}
                        </p>
                    )}
                </div>

                {/* Right: the time moon — aligned to the top of the text */}
                <TimeMoon start={booking.session_start} />
            </div>
        </div>
    );
}