
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import AdminLayout from './layouts/AdminLayout'

import About from './pages/About'
import People from './pages/People'
import Studio from './pages/Studio'
import Booking from './pages/Booking'
import BookingForm from './pages/BookingForm'
import UserLogin from './pages/auth/UserLogin'
import UserRegistration from './pages/auth/UserRegistration'
import UserDashboard from './pages/UserDashboard'
import SSOCallback from './pages/auth/SSOCallback'

import WelcomeIntro from './pages/WelcomeIntro'
import AdminDashBoard from './pages/admin/Dashboard'
import AdminSchedule from './pages/admin/Schedule'
import AdminClients from './pages/admin/Clients'
import AdminMethods from './pages/admin/Methods'
import AdminStaff from './pages/admin/Staff'
import AdminBookings from './pages/admin/Bookings'
import AdminTransactions from './pages/admin/Transactions'
import AdminFinance from './pages/admin/Finance'
import Profile from './pages/Profile'
import Checkout from './pages/Checkout'

import type { PeopleType } from './types/people'
import type { StudioType } from './types/studio'
import type { SessionType } from './types/session'
import { useFetch } from './hooks/useFetch';

function App() {
  const { data: team, error: errorPeople } = useFetch<PeopleType[]>('/api/people');
  const { data: photos, error: errorStudio } = useFetch<StudioType[]>('/api/studio');
  const { data: flows, error: errorFlows, loading: loadingFlows, refetch: refetchFlows } = useFetch<SessionType[]>('/api/sessions');

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<About />} />
          <Route path="people" element={<People data={team} error={errorPeople} />} />
          <Route path="studio" element={<Studio data={photos} error={errorStudio} />} />
          <Route path="booking" element={<Booking data={flows} error={errorFlows} loading={loadingFlows} refetch={refetchFlows} />} />
          <Route path="booking/:flowId" element={<BookingForm onBooked={refetchFlows} />} />
          <Route path="login" element={<UserLogin />} />
          <Route path="register" element={<UserRegistration />} />
          <Route path="account" element={<UserDashboard onSessionsChanged={refetchFlows} />} />
          <Route path="account/profile" element={<Profile />} />
          <Route path="checkout/:bookingId" element={<Checkout onChanged={refetchFlows} />} />
          <Route path="sso-callback" element={<SSOCallback />} />
        </Route>


        <Route path="welcome" element={<WelcomeIntro />} />

        <Route element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashBoard />} />
          <Route path="schedule" element={<AdminSchedule />} />
          <Route path="clients" element={<AdminClients />} />
          <Route path="methods" element={<AdminMethods />} />
          <Route path="staff" element={<AdminStaff />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="transactions" element={<AdminTransactions />} />
          <Route path="finance" element={<AdminFinance />} />
          <Route path="profile" element={<Profile />} />
        </Route>

      </Routes>
    </BrowserRouter>
  )
}

export default App
