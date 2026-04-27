const SIZES = {
    sm: { container: 'w-10 h-10', text: 'text-base' },
    md: { container: 'w-11 h-11', text: 'text-lg' },
    lg: { container: 'w-12 h-12', text: 'text-xl' },
    xl: { container: 'w-16 h-16', text: 'text-2xl' },
} as const;

export default function Initials({ name, size = 'lg' }: { name: string; size?: keyof typeof SIZES }) {
    const parts = name.trim().split(' ');
    const letters = parts.length >= 2
        ? parts[0][0] + parts[parts.length - 1][0]
        : parts[0].slice(0, 2);
    const { container, text } = SIZES[size];
    return (
        <div className={`${container} rounded-full bg-wood-accent/20 flex items-center justify-center shrink-0`}>
            <span className={`font-cormorant ${text} text-wood-dark uppercase`}>{letters}</span>
        </div>
    );
}
