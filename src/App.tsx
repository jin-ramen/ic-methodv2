import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Nav'
import Landing from './pages/Landing'

function App() {

  return (
    <div className="min-h-screen bg-wood-light">
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Header />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/people" element={<Landing />} />
          <Route path="/studio" element={<Landing />} />
        </Routes>
      </BrowserRouter>
    </div>
  )
}

export default App
