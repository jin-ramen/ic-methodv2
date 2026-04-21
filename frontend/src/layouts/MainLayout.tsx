import { Outlet } from 'react-router-dom';
import { Header, Footer } from '../components/Nav';
import Pulses from '../components/Pulses';

export default function MainLayout({ shouldAnimate, handleIntroComplete }: { shouldAnimate: boolean; handleIntroComplete?: () => void; } ) {
  return (
    <div className="flex flex-col min-h-[100dvh]">
      <Header shouldAnimate={shouldAnimate} />
      <Pulses shouldAnimate={shouldAnimate} />
      <main className="flex-1 flex flex-col">
        {/* Child routes (About, People, Studio) inject here */}
        <Outlet context={{ handleIntroComplete }} /> 
      </main>
      <Footer shouldAnimate={shouldAnimate} />
    </div>
  );
}
