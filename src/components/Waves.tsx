import { useEffect, useRef } from 'react'

export default function Background() {
    const layer1 = useRef<HTMLDivElement>(null)
    const layer2 = useRef<HTMLDivElement>(null)
    const layer3 = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Mouse response (desktop)
        const handleMouseMove = (e: MouseEvent) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2
        const y = (e.clientY / window.innerHeight - 0.5) * 2
        if (layer1.current) layer1.current.style.transform = `translate(${x * 12}px, ${y * 12}px)`
        if (layer2.current) layer2.current.style.transform = `translate(${x * -8}px, ${y * -8}px)`
        if (layer3.current) layer3.current.style.transform = `translate(${x * 5}px, ${y * 5}px)`
        }

        // Gyroscope response (mobile)
        const handleOrientation = (e: DeviceOrientationEvent) => {
        const x = (e.gamma || 0) / 45
        const y = (e.beta || 0) / 45
        if (layer1.current) layer1.current.style.transform = `translate(${x * 15}px, ${y * 15}px)`
        if (layer2.current) layer2.current.style.transform = `translate(${x * -10}px, ${y * -10}px)`
        if (layer3.current) layer3.current.style.transform = `translate(${x * 6}px, ${y * 6}px)`
        }

        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('deviceorientation', handleOrientation)
        return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('deviceorientation', handleOrientation)
        }
    }, [])

    return (
        <>
            <div ref={layer1} className="fixed inset-0 pointer-events-none transition-transform duration-300 ease-out">
                <svg className="opacity-0 animate-shape-intro [animation-delay:5250ms] w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M -10,40 Q 40,30 110,60"
                        fill="none"
                        stroke="var(--color-wood-accent)"
                        strokeWidth="0.3"
                        className="arc-breathe"
                    />
                </svg>
            </div>
            <div ref={layer2} className="fixed inset-0 pointer-events-none transition-transform duration-300 ease-out">
                <svg className="opacity-0 animate-shape-intro [animation-delay:5250ms] w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M -10,50 Q 50,10 110,40"
                        fill="none"
                        stroke="var(--color-wood-primary)"
                        strokeWidth="0.2"
                        className="arc-breathe-slow"
                    />
                </svg>
            </div>
            <div ref={layer3} className="fixed inset-0 pointer-events-none transition-transform duration-300 ease-out">
                <svg className="opacity-0 animate-shape-intro [animation-delay:5250ms] w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M -10,60 Q 70,90 110,45"
                        fill="none"
                        stroke="var(--color-wood-accent)"
                        strokeWidth="0.15"
                        className="arc-breathe-fast"
                    />
                </svg>
            </div>
        </>
    )
}