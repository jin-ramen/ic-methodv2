import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function About() {

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])


  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-[45vw] md:w-[30vw] lg:w-[20vw] flex flex-col items-center gap-8">
        <p className="opacity-0 animate-text-in [animation-delay:0ms] text-[clamp(0.9rem,1.3vw,1.3rem)] text-center font-playfair text-wood-dark">
          In a vast ocean where dreams roar louder than cannon fire, One Piece follows Monkey D. Luffy, a rubber-bodied boy chasing the legendary treasure of Gol D. Roger. With his crew by his side, each island becomes a tale of laughter, loss, and unbreakable bonds, as Luffy sails not just to become Pirate King, but to live freely in a world without limits.
        </p>
        <Link
          to="/booking"
          className=" opacity-0 animate-text-in [animation-delay:200ms] inline-flex items-center gap-3 font-didot text-xs tracking-[0.2em] uppercase bg-wood-accent text-wood-text hover:bg-wood-dark transition-colors duration-300 py-3 px-8 rounded-xl group"
        >
          <span className="hidden md:flex">Book Now</span>
          <span className="md:hidden flex">Book</span>
          <span className="text-wood-text/40 text-[10px] transition-transform duration-300 group-hover:translate-x-1">→</span>
        </Link>
      </div>
    </div>
  )
}
