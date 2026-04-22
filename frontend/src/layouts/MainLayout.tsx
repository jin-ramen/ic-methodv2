import { Outlet } from 'react-router-dom';
import { Header, Footer } from '../components/Nav';
import Pulses from '../components/Pulses';

export default function MainLayout() {
  return (
    <div className="flex flex-col min-h-[100dvh]">
      <Header />
      <Pulses />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}