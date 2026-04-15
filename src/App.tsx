import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Header, Footer } from './components/Nav'
import Waves from './components/Waves'
import Landing from './pages/Landing'
import People from './pages/People'

function App() {

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="flex flex-col min-h-[100dvh]">
        <Header />
        <Waves />
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/people" element={<People />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App
