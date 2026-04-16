import './App.css'
import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Header, Footer } from './components/Nav'
import Pulses from './components/Pulses'
import Landing from './pages/Landing'
import People from './pages/People'
import Studio from './pages/Studio'

function App() {
  const [shouldAnimate, setShouldAnimate] = useState(() => {
    return !sessionStorage.getItem('introSeen');
  });

  const handleIntroComplete = () => {
    sessionStorage.setItem('introSeen', '1');
    setShouldAnimate(false); // This triggers a re-render and hides it everywhere
  };

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="flex flex-col min-h-[100dvh]">
        <Header shouldAnimate={shouldAnimate} />
        <Pulses shouldAnimate={shouldAnimate} />
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<Landing onIntroComplete={handleIntroComplete} shouldAnimate={shouldAnimate} />} />
            <Route path="/people" element={<People />} />
            <Route path="/studio" element={<Studio />} />
          </Routes>
        </main>
        <Footer shouldAnimate={shouldAnimate} />
      </div>
    </BrowserRouter>
  )
}

export default App
