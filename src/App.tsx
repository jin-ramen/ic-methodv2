import './App.css'

function App() {

  return (
    <>
      <div className="fixed inset-0 -z-10 w-screen h-screen bg-[#331105] animate-bg-intro overflow-hidden">
        {/* Simplified symmetric reformer shape — right side */}
        <div className="animate-shape-intro [animation-delay:1000ms] absolute w-[130vh] h-[100vh] top-1/2 left-[40%] -translate-y-1/2 opacity-0 flex items-center">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 650 500" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Frame — outer rectangle */}
            <rect x="30" y="30" width="590" height="440" rx="12" stroke="#683B2B" strokeWidth="6" />
            {/* Left foot bar */}
            <rect x="30" y="100" width="8" height="300" rx="4" fill="#8B5A4A" />
            {/* Right shoulder blocks */}
            <rect x="612" y="100" width="8" height="300" rx="4" fill="#8B5A4A" />
            {/* Carriage (sliding platform) */}
            <rect x="220" y="170" width="220" height="160" rx="8" fill="#683B2B" />
            {/* Rails — top and bottom */}
            <line x1="50" y1="120" x2="600" y2="120" stroke="#5A3020" strokeWidth="3" strokeLinecap="round" />
            <line x1="50" y1="380" x2="600" y2="380" stroke="#5A3020" strokeWidth="3" strokeLinecap="round" />
            {/* Springs — center */}
            <line x1="170" y1="235" x2="220" y2="245" stroke="#8B5A4A" strokeWidth="2" />
            <line x1="170" y1="250" x2="220" y2="250" stroke="#8B5A4A" strokeWidth="2" />
            <line x1="170" y1="265" x2="220" y2="255" stroke="#8B5A4A" strokeWidth="2" />
            {/* Rope/strap loops — symmetric */}
            <circle cx="100" cy="250" r="15" stroke="#8B5A4A" strokeWidth="2.5" />
            <circle cx="550" cy="250" r="15" stroke="#8B5A4A" strokeWidth="2.5" />
            {/* Foot bar — left end */}
            <line x1="60" y1="160" x2="60" y2="340" stroke="#8B5A4A" strokeWidth="5" strokeLinecap="round" />
            {/* Headrest — right end */}
            <rect x="580" y="220" width="25" height="60" rx="6" fill="#5A3020" />
          </svg>
          {/* Text inside the reformer */}
          <p className="animate-text-intro [animation-delay:1750ms] font-didot text-[#FFEDE8] text-2xl italic tracking-widest opacity-0 z-10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            PILATES&nbsp;&bull;&nbsp;BARRE
          </p>
        </div>

        {/* Title text on the left side */}
        <div className="absolute top-1/2 left-[5%] -translate-y-1/2">
          <h1 className="font-didot animate-text-intro [animation-delay:1750ms] text-[#FFEDE8] text-2xl opacity-0">
            IC METHOD
          </h1>
        </div>
      </div>
    </>
  )
}

export default App
