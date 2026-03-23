import { Routes, Route } from 'react-router-dom'
import NewsTally from './pages/NewsTally'
import Socialgati from './pages/Socialgati'
import Shorts from './pages/Shorts'
import NewsOpen from './pages/NewsOpen'

export default function App() {
  return (
    <Routes>
      <Route path="/"         element={<Socialgati />} />
      <Route path="/news"     element={<NewsTally />} />
      <Route path="/shorts"   element={<Shorts />} />
      <Route path="/news/:id" element={<NewsOpen />} />
    </Routes>
  )
}
