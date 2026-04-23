import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import AdminLayout from './layouts/AdminLayout'

import About from './pages/About'
import People from './pages/People'
import Studio from './pages/Studio'
import Booking from './pages/Booking'
import BookingForm from './pages/BookingForm'

import AdminDashBoard from './pages/admin/Dashboard'

import type { PeopleType } from './types/people'
import type { StudioType } from './types/studio'
import type { FlowType } from './types/flow'
import { useFetch } from './utils/useFetch';

function App() {
  const { data: team, error: errorPeople } = useFetch<PeopleType[]>('/api/people');
  const { data: photos, error: errorStudio } = useFetch<StudioType[]>('/api/studio');
  const { data: flows, error: errorFlows, loading: loadingFlows, refetch: refetchFlows } = useFetch<FlowType[]>('/api/flows');

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>

        <Route element={<MainLayout />}>
          <Route index element={<About />} />
          <Route path="people" element={<People data={team} error={errorPeople} />} />
          <Route path="studio" element={<Studio data={photos} error={errorStudio} />} />
          <Route path="booking" element={<Booking data={flows} error={errorFlows} loading={loadingFlows} />} />
          <Route path="booking/:flowId" element={<BookingForm onBooked={refetchFlows} />} />
        </Route>


        <Route element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashBoard />} />
        </Route>

      </Routes>
    </BrowserRouter>
  )
}

export default App
