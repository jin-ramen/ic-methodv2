import './App.css'
import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Header, Footer } from './components/Nav'
import Waves from './components/Waves'
import Landing from './pages/Landing'
import People from './pages/People'

function App() {
  const [shouldAnimate, setShouldAnimate] = useState(
    !sessionStorage.getItem('introSeen')
  )

  const handleIntroComplete = () => {
    sessionStorage.setItem('introSeen', '1')
    setShouldAnimate(false)
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="flex flex-col min-h-[100dvh]">
        <Header shouldAnimate={shouldAnimate} />
        <Waves shouldAnimate={shouldAnimate} />
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<Landing onIntroComplete={handleIntroComplete} shouldAnimate={shouldAnimate} />} />
            <Route path="/people" element={<People />} />
          </Routes>
        </main>
        <Footer shouldAnimate={shouldAnimate} />
      </div>
    </BrowserRouter>
  )
}

export default App
