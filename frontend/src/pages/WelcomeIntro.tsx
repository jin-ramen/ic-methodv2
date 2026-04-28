import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function WelcomeIntro() {
    const navigate = useNavigate();
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        const t1 = setTimeout(() => setExiting(true), 3000);   // longer hold for appreciation
        const t2 = setTimeout(() => navigate('/account', { replace: true }), 4200);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [navigate]);

    // Ultra‑smooth rise with a micro‑bounce for sophistication
    const up = (delay: string): React.CSSProperties => ({
        animation: `luxuryRise 1.2s cubic-bezier(0.33, 1.3, 0.65, 1) ${delay} both`,
    });

    return (
        <>
            <style>{`
                /* Entrance: soft focus pull + subtle zoom */
                @keyframes luxuryFocusIn {
                    0% {
                        opacity: 0;
                        filter: blur(6px);
                        transform: scale(1.04);
                    }
                    100% {
                        opacity: 1;
                        filter: blur(0);
                        transform: scale(1);
                    }
                }

                /* Text lift with a whisper of bounce */
                @keyframes luxuryRise {
                    0% {
                        opacity: 0;
                        transform: translateY(36px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                /* Exit: darken, blur, then slide everything down */
                @keyframes luxuryFadeAway {
                    0% {
                        filter: brightness(1) blur(0);
                        transform: translateY(0) scale(1);
                        opacity: 1;
                    }
                    30% {
                        filter: brightness(0.7) blur(1.5px);
                        transform: translateY(0) scale(1);
                        opacity: 1;
                    }
                    100% {
                        filter: brightness(0.2) blur(6px);
                        transform: translateY(100vh) scale(0.94);
                        opacity: 0;
                    }
                }
            `}</style>

            <div
                className="fixed inset-0 bg-wood-dark flex items-center justify-center overflow-hidden"
                style={{
                    animation: exiting
                        ? 'luxuryFadeAway 1.4s cubic-bezier(0.5, 0, 0.75, 0) forwards'
                        : 'luxuryFocusIn 1.6s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                }}
            >
                <div className="flex flex-col md:flex-row items-center justify-center gap-10 md:gap-16 select-none px-8">
                    <p
                        className="font-cormorant text-wood-text text-5xl md:text-7xl tracking-wide"
                        style={up('1s')}
                    >
                        IC METHOD
                    </p>

                    <div style={up('1.3s')}>
                        <div className="w-14 h-px md:w-px md:h-20 bg-wood-text/20" />
                    </div>

                    <p
                        className="font-didot text-wood-text/50 text-[11px] tracking-[0.35em] uppercase"
                        style={up('1.8s')}
                    >
                        PILATES · BARRE
                    </p>
                </div>
            </div>
        </>
    );
}