export function ICMonogram() {
    return (
        <div 
            className="fixed inset-0 overflow-hidden pointer-events-none select-none z-0" 
            aria-hidden="true"
        >
            <svg
                viewBox="0 0 1200 800"
                className="absolute w-[160vw] md:w-[120vw] lg:w-[100vw] h-auto"
                style={{
                    bottom: '0',
                    right: '0',
                    transform: 'translate(15%, 30%)',
                }}
            >
                <text
                    x="800"
                    y="700"
                    fontFamily="'Didot', 'Bodoni MT', 'Playfair Display', serif"
                    fontSize="800"
                    fontWeight="400"
                    letterSpacing="-16"
                    fill="currentColor"
                    className="text-wood-accent"
                    opacity="0.04"
                >
                    IC
                </text>
            </svg>
        </div>
    );
}