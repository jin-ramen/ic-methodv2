import { Link } from 'react-router-dom';

export function UserCreditsCard({ credits }: { credits: number }) {
    const MAX = 10;
    const circumference = 2 * Math.PI * 15.5;
    const offset = circumference * (1 - credits / MAX);

    return (
        <div className="rounded-2xl bg-wood-accent/10 border border-wood-text/5 px-5 py-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <p className="font-didot text-[10px] tracking-[0.3em] uppercase text-wood-accent">Credits</p>
                <Link
                    to="/booking"
                    className="font-didot text-[10px] tracking-[0.2em] uppercase text-wood-accent/70 hover:text-wood-dark transition-colors duration-500"
                >
                    Stack Your Credits →
                </Link>
            </div>
            <div className="flex items-center gap-6">
                <div className="relative w-16 h-16 shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor"
                                className="text-wood-text/10" strokeWidth="1" />
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor"
                                className="text-wood-dark/40" strokeWidth="1.5"
                                strokeDasharray={circumference}
                                strokeDashoffset={offset}
                                strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center font-cormorant text-xl text-wood-dark">
                        {credits}
                    </span>
                </div>
                <p className="font-didot text-xs text-wood-accent/50 leading-relaxed">
                    Credits recharge monthly. Use them to book any class.
                </p>
            </div>
        </div>
    );
}