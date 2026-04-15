import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Nav from './components/Nav'
import Waves from './components/Waves'
import Landing from './pages/Landing'
import People from './pages/People'

function App() {

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Nav />
      <Waves />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/people" element={<People />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
