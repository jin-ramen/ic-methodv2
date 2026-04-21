import './App.css'
import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Header, Footer } from './components/Nav'
import Pulses from './components/Pulses'
import About from './pages/About'
import People from './pages/People'
import Studio from './pages/Studio'

import BookList from './pages/book/BookList'
import BookSlot from './pages/book/BookSlot'
import BookConfirmation from './pages/book/BookConfirmation'

import AdminLayout from './pages/admin/AdminLayout';
import AdminHome from './pages/admin/AdminHome';
import AdminCalendar from './pages/admin/AdminCalendar';
import AdminBookings from './pages/admin/AdminBookings';
import AdminResources from './pages/admin/AdminResources';
import AdminRules from './pages/admin/AdminRules';


import type { PeopleType } from './types/people'
import type { StudioType } from './types/studio'
import { useFetch } from './utils/useFetch';


function App() {
  const { data: team, error: errorPeopple } = useFetch<PeopleType []>('/api/people');
  const { data: photos, error: errorStudio } = useFetch<StudioType []>('/api/studio');

  const [shouldAnimate, setShouldAnimate] = useState(() => {
    return !localStorage.getItem('introSeen');
  });

  const handleIntroComplete = () => {
    localStorage.setItem('introSeen', '1');
    setShouldAnimate(false); // This triggers a re-render and hides it everywhere
  };

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="flex flex-col min-h-[100dvh]">
        <Header shouldAnimate={shouldAnimate} />
        <Pulses shouldAnimate={shouldAnimate} />
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<About onIntroComplete={handleIntroComplete} shouldAnimate={shouldAnimate} />} />
            <Route path="/people" element={<People data={ team } error={ errorPeopple } />} />
            <Route path="/studio" element={<Studio data={ photos } error={ errorStudio } />} />
            <Route path="/book" element={<BookList />} />
            <Route path="/book/:resourceId" element={<BookSlot />} />
            <Route path="/book/confirmation/:bookingId" element={<BookConfirmation />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminHome />} />
              <Route path="calendar" element={<AdminCalendar />} />
              <Route path="bookings" element={<AdminBookings />} />
              <Route path="resources" element={<AdminResources />} />
              <Route path="resources/:resourceId/rules" element={<AdminRules />} />
            </Route>
          </Routes>
        </main>
        <Footer shouldAnimate={shouldAnimate} />
      </div>
    </BrowserRouter>
  )
}

export default App
