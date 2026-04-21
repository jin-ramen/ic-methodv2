import './App.css'
import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import About from './pages/About'
import People from './pages/People'
import Studio from './pages/Studio'
import type { PeopleType } from './types/people'
import type { StudioType } from './types/studio'
import { useFetch } from './utils/useFetch';

function App() {
  const { data: team, error: errorPeople } = useFetch<PeopleType[]>('/api/people');
  const { data: photos, error: errorStudio } = useFetch<StudioType[]>('/api/studio');

  const [shouldAnimate, setShouldAnimate] = useState(() => {
    return !localStorage.getItem('introSeen');
  });

  const handleIntroComplete = () => {
    localStorage.setItem('introSeen', '1');
    setShouldAnimate(false);
  };

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        
        <Route element={ <MainLayout shouldAnimate={shouldAnimate} handleIntroComplete={handleIntroComplete} />}>
          <Route index element={<About onIntroComplete={handleIntroComplete} shouldAnimate={shouldAnimate}/>} />
          <Route path="people" element={<People data={team} error={errorPeople} />} />
          <Route path="studio" element={<Studio data={photos} error={errorStudio} />} />
        </Route>

        {/* <Route path="/admin" element={<AdminLayout />}>
        </Route> */}

      </Routes>
    </BrowserRouter>
  )
}

export default App
