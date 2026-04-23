import { getDayLabel } from '../utils/dateUtils'

type Props = {
    date: Date;
    index?: number;
    onIconClick?: () => void;
    variant?: 'dark' | 'light';
}

export default function DayHeader({ date, index = 0, onIconClick, variant = 'dark' }: Props) {
    const border  = variant === 'light' ? 'border-wood-accent/20' : 'border-wood-text/20';
    const label   = variant === 'light' ? 'text-wood-dark'        : 'text-wood-text';
    const sub     = variant === 'light' ? 'text-wood-accent/50'   : 'text-wood-text/50';
    const icon    = variant === 'light' ? 'text-wood-accent/40 hover:text-wood-accent/70' : 'text-wood-text/40 hover:text-wood-text/70';

    return (
        <div
            className={`pb-3 border-b ${variant === 'dark' ? 'opacity-0 animate-text-in' : ''} flex items-stretch justify-between ${border}`}
            style={{ animationDelay: `${index * 0.1}s` }}
        >
            <div>
                <p className={`font-didot text-xs tracking-widest uppercase ${label}`}>{getDayLabel(date)}</p>
                <p className={`font-cormorant text-sm mt-0.5 ${sub}`}>
                    {date.toLocaleDateString('en-AU', { month: 'long', day: 'numeric' })}
                </p>
            </div>
            <button onClick={onIconClick} className="md:hidden flex items-stretch focus:outline-none">
                {variant === 'dark' && <svg xmlns="http://www.w3.org/2000/svg" className={`h-9 w-auto transition-colors ${icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>}
            </button>
        </div>
    );
}