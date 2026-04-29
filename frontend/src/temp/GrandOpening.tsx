import { useState, useEffect } from 'react';

export default function GrandOpening() {
    const [visible, setVisible] = useState(() => {
        // Check sessionStorage on mount
        return !sessionStorage.getItem('grand_opening_seen');
    });

    // Mark as seen once component mounts
    useEffect(() => {
        if (visible) {
            sessionStorage.setItem('grand_opening_seen', 'true');
            // Auto-dismiss after 8 seconds if user hasn't scrolled past
            const timer = setTimeout(() => setVisible(false), 300000);
            return () => clearTimeout(timer);
        }
    }, [visible]);

    // Don't render anything if already seen
    if (!visible) return null;

    const palette = ['#C8A96E', '#E8C4A2', '#B8C5B2', '#D4A5A5', '#F5E6D3'];

    const sparkles = Array.from({ length: 80 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 4 + Math.random() * 14,
        duration: 8 + Math.random() * 6,
        delay: Math.random() * 12,
        color: palette[Math.floor(Math.random() * palette.length)],
        opacity: 0.12 + Math.random() * 0.35,
    }));

    return (
        <>
            {/* Full‑page sparkle rain */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                {sparkles.map(s => (
                    <span
                        key={s.id}
                        className="absolute"
                        style={{
                            left: `${s.left}%`,
                            top: '-10%',
                            fontSize: `${s.size}px`,
                            color: s.color,
                            opacity: s.opacity,
                            filter: `drop-shadow(0 0 3px ${s.color})`,
                            animation: `sparkleFall ${s.duration}s linear ${s.delay}s infinite`,
                            transform: 'rotate(45deg)',
                        }}
                    >
                        ✦
                    </span>
                ))}
            </div>

            {/* Badge */}
            <div className="flex items-center gap-4 select-none animate-fade-in">
                <div className="h-px w-8 bg-wood-accent/30 origin-right animate-line-draw" />
                <div className="flex items-center gap-2 animate-gentle-rise">
                    <span className="text-wood-accent/50 text-[20px] animate-wink">✦</span>
                    <p className="font-didot text-[10px] tracking-[0.4em] uppercase text-wood-accent/70">
                        Grand Opening
                    </p>
                    <span className="text-wood-accent/50 text-[20px] animate-wink">✦</span>
                </div>
                <div className="h-px w-8 bg-wood-accent/30 origin-left animate-line-draw" />
            </div>

            <style>{`
                @keyframes sparkleFall {
                    0%   { transform: translateY(0) rotate(45deg) scale(0.8); opacity: 0; }
                    5%   { opacity: 1; }
                    85%  { opacity: 1; }
                    100% { transform: translateY(calc(100vh + 30px)) rotate(65deg) scale(1); opacity: 0; }
                }
                @keyframes softPulse {
                    0%, 100% { transform: scale(1); opacity: 0.7; }
                    50%      { transform: scale(1.4); opacity: 1; }
                }
                @keyframes gentleRise {
                    0% { opacity: 0; transform: translateY(6px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                @keyframes lineDraw {
                    0% { transform: scaleX(0); }
                    100% { transform: scaleX(1); }
                }
                @keyframes wink {
                    0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
                    90% { opacity: 0.8; transform: scale(1.1); }
                }
                @keyframes fadeIn {
                    0% { opacity: 0; }
                    100% { opacity: 1; }
                }
                .animate-soft-pulse  { animation: softPulse 3s ease-in-out infinite; }
                .animate-gentle-rise { animation: gentleRise 0.9s cubic-bezier(0.34,1.56,0.64,1) both; }
                .animate-line-draw   { animation: lineDraw 1s cubic-bezier(0.16,1,0.3,1) both; }
                .animate-wink        { animation: wink 4s infinite; }
                .animate-fade-in     { animation: fadeIn 1s ease-out both; }
            `}</style>
        </>
    );
}