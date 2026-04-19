import { useEffect, useRef, useState } from "react"
import type { StudioType } from '../types/studio'

function FadeInImage({ src, alt, onHover }: { src: string; alt: string; onHover: (text: string | null) => void }) {
    const ref = useRef<HTMLDivElement>(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true)
                    observer.disconnect()
                }
            },
            { threshold: 0.2 }
        )
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    return (
        <div
            ref={ref}
            className={`h-screen flex items-center justify-center transition-opacity duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}
        >
            <img
                className="max-h-[70vh] max-w-[80vw] object-contain cursor-pointer"
                src={src}
                alt={alt}
                onMouseEnter={() => onHover(alt)}
                onMouseLeave={() => onHover(null)}
            />
        </div>
    )
}

function OpeningHours() {
    const ref = useRef<HTMLDivElement>(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true)
                    observer.disconnect()
                }
            },
            { threshold: 0.2 }
        )
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    return (
        <div
            ref={ref}
            className={`h-screen flex items-center justify-center transition-opacity duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}
        >
            <div className="relative flex flex-col items-center">
                {/* Decorative line */}
                <div className={`w-px bg-wood-accent/30 transition-all duration-1000 delay-200 ${visible ? 'h-20' : 'h-0'}`} />

                <div className="my-12 flex flex-col items-center gap-4">
                    <p className={`font-cormorant text-wood-accent/50 text-xs tracking-[0.5em] uppercase transition-all duration-700 delay-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
                        Every day
                    </p>

                    <div className="flex items-center gap-5">
                        <span className={`font-cormorant text-wood-accent text-4xl md:text-5xl tracking-wider transition-all duration-700 delay-700 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
                            9
                        </span>
                        <span className={`w-12 h-px bg-wood-accent/40 transition-all duration-700 delay-900 ${visible ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`} />
                        <span className={`font-cormorant text-wood-accent text-4xl md:text-5xl tracking-wider transition-all duration-700 delay-1100 ${visible ? 'opacity-100 -translate-x-0' : 'opacity-0 -translate-x-4'}`}>
                            7
                        </span>
                    </div>

                    <p className={`font-playfair text-wood-dark text-xs tracking-[0.4em] italic transition-all duration-700 delay-1300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
                        am &mdash; pm
                    </p>
                </div>

                {/* Decorative line */}
                <div className={`w-px bg-wood-accent/30 transition-all duration-1000 delay-1500 ${visible ? 'h-20' : 'h-0'}`} />
            </div>
        </div>
    )
}

type StudioProps = {
  data: StudioType[] | null
  error: string | null
}

export default function Studio({ data: photos, error }: StudioProps) {
    const [hoveredText, setHoveredText] = useState<string | null>(null)

    if (error) {
        return (
            <div className="px-8 lg:px-50 text-red-600">
                Couldn't load the photos: {error}
            </div>
        );
    }

    if (!photos) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-15 px-8 lg:px-50">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-64 rounded-xl bg-gray-200 animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className='overflow-x-hidden z-20 -mt-20'>
            {photos.map((photo, index) => (
                <FadeInImage key={index} src={photo.img} alt={photo.title} onHover={setHoveredText} />
            ))}
            {/* Opening Hours */}
            <OpeningHours />
            <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 font-playfair text-wood-dark text-sm tracking-widest transition-opacity duration-300 md:${hoveredText ? 'opacity-100' : 'opacity-0'}`}>
                {hoveredText}
            </div>
        </div>
    )
}