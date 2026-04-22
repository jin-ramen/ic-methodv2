import { useEffect, useRef } from 'react'

const LAYERS = [
    { d: 'M -10,40 Q 40,30 110,60', stroke: 'var(--color-wood-accent)', strokeWidth: '0.3', breathe: 'arc-breathe', mouse: 12, gyro: 15 },
    { d: 'M -10,50 Q 50,10 110,40', stroke: 'var(--color-wood-primary)', strokeWidth: '0.2', breathe: 'arc-breathe-slow', mouse: -8, gyro: -10 },
    { d: 'M -10,60 Q 70,90 110,45', stroke: 'var(--color-wood-accent)', strokeWidth: '0.15', breathe: 'arc-breathe-fast', mouse: 5, gyro: 6 },
] as const;

export default function Pulse() {
    const refs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        let frame = 0;
        let pendingX = 0;
        let pendingY = 0;
        let scale: 'mouse' | 'gyro' = 'mouse';

        const apply = () => {
            frame = 0;
            LAYERS.forEach((layer, i) => {
                const m = layer[scale];
                const el = refs.current[i];
                if (el) el.style.transform = `translate(${pendingX * m}px, ${pendingY * m}px)`;
            });
        };

        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(apply);
        };

        const handleMouseMove = (e: MouseEvent) => {
            scale = 'mouse';
            pendingX = (e.clientX / window.innerWidth - 0.5) * 2;
            pendingY = (e.clientY / window.innerHeight - 0.5) * 2;
            schedule();
        };

        const handleOrientation = (e: DeviceOrientationEvent) => {
            scale = 'gyro';
            pendingX = (e.gamma || 0) / 45;
            pendingY = (e.beta || 0) / 45;
            schedule();
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('deviceorientation', handleOrientation);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('deviceorientation', handleOrientation);
            if (frame) cancelAnimationFrame(frame);
        };
    }, []);

    return (
        <>
            {LAYERS.map((layer, i) => (
                <div
                    key={i}
                    ref={el => { refs.current[i] = el; }}
                    className="fixed inset-0 pointer-events-none transition-transform duration-300 ease-out"
                >
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                            d={layer.d}
                            fill="none"
                            stroke={layer.stroke}
                            strokeWidth={layer.strokeWidth}
                            className={layer.breathe}
                        />
                    </svg>
                </div>
            ))}
        </>
    )
}
