import './App.css'
import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import About from './pages/About'
import People from './pages/People'
import Studio from './pages/Studio'
import Booking from './pages/Booking'
import BookingForm from './pages/BookingForm'
import type { PeopleType } from './types/people'
import type { StudioType } from './types/studio'
import type { FlowType } from './types/flow'
import { useFetch } from './utils/useFetch';

function App() {
  const { data: team, error: errorPeople } = useFetch<PeopleType[]>('/api/people');
  const { data: photos, error: errorStudio } = useFetch<StudioType[]>('/api/studio');
  const { data: flows, error: errorFlows, loading: loadingFlows, refetch: refetchFlows } = useFetch<FlowType[]>('/api/flows');

  const [shouldAnimate, setShouldAnimate] = useState(() => {
    return !localSe.getItem('introSeen');
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
          <Route path="booking" element={<Booking data={flows} error={errorFlows} loading={loadingFlows} />} />
          <Route path="booking/:flowId" element={<BookingForm onBooked={refetchFlows} />} />
        </Route>

        {/* <Route path="/admin" element={<AdminLayout />}>
        </Route> */}

      </Routes>
    </BrowserRouter>
  )
}

export default App
