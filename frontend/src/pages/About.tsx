import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import GrandOpening from '../temp/GrandOpening'

export default function About() {

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])


  return (
    <>
    <div className="flex-1 flex items-start justify-center">
      <div className="w-[70vw] md:w-[45vw] lg:w-[30vw] flex flex-col items-center gap-8 mt-[20vh] md:mt-[25vh]">
                          
        <GrandOpening />     

        <p className="opacity-0 animate-text-in [animation-delay:0ms] text-[clamp(0.9rem,1.6vw,1.2rem)] text-center font-playfair text-wood-dark/80">
          IC Method is a Barre × Pilates atelier born from a lifelong devotion to movement. Here, dance heritage meets precise, aesthetic instruction. Every session unfolds through line, rhythm, and breath—guiding bodies toward control, expression, and mindful connection. It is a quiet, considered space to return to yourself. Hawthorn.
        </p>
        <Link
          to="/booking"
          className=" opacity-0 animate-text-in [animation-delay:200ms] inline-flex items-center gap-3 font-didot text-xs tracking-[0.2em] uppercase bg-wood-accent/90 text-wood-text text-[clamp(0.7rem,1.5vw,0.85rem)] hover:bg-wood-dark transition-colors duration-300 py-3 px-8 rounded-md group"
        >
          <>
            <span className="hidden md:flex">Book Now</span>
            <span className="md:hidden flex">Book</span>
          </>
          <span className="text-wood-text/40 text-[10px] transition-transform duration-300 group-hover:translate-x-1">→</span>
        </Link>
      </div>
    </div>
    </>
  )
}
