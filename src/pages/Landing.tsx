import { useState, useEffect } from 'react'

function IntroAnimation({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 5500);
    return () => {
      clearTimeout(timer)
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50  bg-wood-bg animate-bg-intro overflow-hidden">
      {/* Simplified symmetric reformer shape — right side */}
      <div className="animate-shape-intro [animation-delay:1000ms] absolute w-[70vh] h-[100vw] top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 rotate-90 md:w-[60vw] md:h-[100vw] md:top-1/2 md:left-[40%] md:-translate-y-1/2 md:translate-x-0 md:rotate-0 opacity-0 flex items-center">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 650 500" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Frame — outer rectangle */}
          <rect x="30" y="30" width="590" height="440" rx="12" stroke="var(--color-wood-primary)" strokeWidth="6" />
          {/* Left foot bar */}
          <rect x="30" y="100" width="8" height="300" rx="4" fill="var(--color-wood-accent)" />
          {/* Right shoulder blocks */}
          <rect x="612" y="100" width="8" height="300" rx="4" fill="var(--color-wood-accent)" />
          {/* Carriage (sliding platform) */}
          <rect x="220" y="170" width="220" height="160" rx="8" fill="var(--color-wood-primary)" />
          {/* Rails — top and bottom */}
          <line x1="50" y1="120" x2="600" y2="120" stroke="var(--color-wood-dark)" strokeWidth="3" strokeLinecap="round" />
          <line x1="50" y1="380" x2="600" y2="380" stroke="var(--color-wood-dark)" strokeWidth="3" strokeLinecap="round" />
          {/* Springs — center */}
          <line x1="170" y1="235" x2="220" y2="245" stroke="var(--color-wood-accent)" strokeWidth="2" />
          <line x1="170" y1="250" x2="220" y2="250" stroke="var(--color-wood-accent)" strokeWidth="2" />
          <line x1="170" y1="265" x2="220" y2="255" stroke="var(--color-wood-accent)" strokeWidth="2" />
          {/* Rope/strap loops — symmetric */}
          <circle cx="100" cy="250" r="15" stroke="var(--color-wood-accent)" strokeWidth="2.5" />
          <circle cx="550" cy="250" r="15" stroke="var(--color-wood-accent)" strokeWidth="2.5" />
          {/* Foot bar — left end */}
          <line x1="60" y1="160" x2="60" y2="340" stroke="var(--color-wood-accent)" strokeWidth="5" strokeLinecap="round" />
          {/* Headrest — right end */}
          <rect x="580" y="220" width="25" height="60" rx="6" fill="var(--color-wood-dark)" />
        </svg>
        {/* Text inside the reformer */}
        <p className="animate-text-intro [animation-delay:1750ms] font-cormorant text-wood-text text-2xl italic tracking-widest opacity-0 z-10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 md:rotate-0">
          PILATES&nbsp;&bull;&nbsp;BARRE
        </p>
      </div>

      {/* Title text on the left side */}
      <div className="absolute top-[12%] left-1/2 -translate-x-1/2 md:top-1/2 md:left-[10%] md:-translate-y-1/2 md:translate-x-0">
        <h1 className="font-cormorant animate-text-intro [animation-delay:1750ms] text-wood-text text-2xl opacity-0">
          IC METHOD.
        </h1>
      </div>
    </div>
  )
}

export default function Landing() {
  const [showIntro, setShowIntro] = useState(() => sessionStorage.getItem('introSeen') ? 0 : 1)
  

  return (
    <div className="relative landing-page">
      {showIntro ? <IntroAnimation onComplete={ () => { sessionStorage.setItem('introSeen', '1'); setShowIntro(0) } } /> : null}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[45vw] md:w-[30vw] lg:w-[20vw]">
        <p className={`opacity-0 animate-text-intro text-[clamp(0.9rem,1.3vw,1.3rem)] text-center font-playfair text-wood-dark ${showIntro ? '[animation-delay:5500ms]' : '[animation-delay:0ms]'}`}>
          In a vast ocean where dreams roar louder than cannon fire, One Piece follows Monkey D. Luffy, a rubber-bodied boy chasing the legendary treasure of Gol D. Roger. With his crew by his side, each island becomes a tale of laughter, loss, and unbreakable bonds, as Luffy sails not just to become Pirate King, but to live freely in a world without limits.
        </p>
      </div>
    </div>
  )
}