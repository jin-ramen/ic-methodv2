import './App.css'
import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Header, Footer } from './components/Nav'
import Pulses from './components/Pulses'
import About from './pages/About'
import People from './pages/People'
import Studio from './pages/Studio'
import type { PeopleType } from './types/people'
import type { StudioType } from './types/studio'
import { useFetch } from './utils/useFetch';


function App() {
  const [shouldAnimate, setShouldAnimate] = useState(() => {
    return !sessionStorage.getItem('introSeen');
  });

  const handleIntroComplete = () => {
    sessionStorage.setItem('introSeen', '1');
    setShouldAnimate(false); // This triggers a re-render and hides it everywhere
  };

  const { data: team, error: error_people } = useFetch<PeopleType []>('/api/people');
  const { data: photos, error: error_studio } = useFetch<StudioType []>('/api/studio');

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="flex flex-col min-h-[100dvh]">
        <Header shouldAnimate={shouldAnimate} />
        <Pulses shouldAnimate={shouldAnimate} />
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<About onIntroComplete={handleIntroComplete} shouldAnimate={shouldAnimate} />} />
            <Route path="/people" element={<People data={ team } error={ error_people } />} />
            <Route path="/studio" element={<Studio data={ photos } error={ error_studio } />} />
          </Routes>
        </main>
        <Footer shouldAnimate={shouldAnimate} />
      </div>
    </BrowserRouter>
  )
}

export default App
