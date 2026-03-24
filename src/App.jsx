import { Routes, Route } from 'react-router-dom'
import Socialgati from './pages/Socialgati'
import NewsTally from './pages/NewsTally'
import Shorts from './pages/Shorts'
import NewsOpen from './pages/NewsOpen'
import About from './pages/About'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Contact from './pages/Contact'
import Alerts from './pages/Alerts'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/"          element={<Socialgati />} />
      <Route path="/news"      element={<NewsTally />} />
      <Route path="/shorts"    element={<Shorts />} />
      <Route path="/news/:id"  element={<NewsOpen />} />
      <Route path="/alerts"    element={<Alerts />} />
      <Route path="/about"     element={<About />} />
      <Route path="/privacy"   element={<Privacy />} />
      <Route path="/terms"     element={<Terms />} />
      <Route path="/contact"   element={<Contact />} />
      <Route path="*"          element={<NotFound />} />
    </Routes>
  )
}
