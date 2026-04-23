export const inputCls = 'w-full font-didot text-sm text-wood-text bg-wood-text/10 border border-wood-text/20 focus:border-wood-text/50 focus:outline-none rounded-lg px-3 py-2 transition-colors duration-200 placeholder:text-wood-text/30';

export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
            <label className="font-didot text-xs text-wood-text/40 tracking-wide">{label}</label>
            {children}
        </div>
    );
}