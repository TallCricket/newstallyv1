import { Routes, Route } from 'react-router-dom'
import Socialgati            from './pages/Socialgati'
import NewsTally             from './pages/NewsTally'
import Shorts                from './pages/Shorts'
import NewsOpen              from './pages/NewsOpen'
import NotificationsFullPage from './pages/NotificationsFullPage'
import Profile               from './pages/Profile'
import HashtagPage           from './pages/HashtagPage'
import SearchPage            from './pages/SearchPage'
import ManagerPage           from './pages/ManagerPage'
import { About, Privacy, Terms, Contact } from './pages/StaticPages'
import NotFound              from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/"              element={<Socialgati />} />
      <Route path="/news"          element={<NewsTally />} />
      <Route path="/shorts"        element={<Shorts />} />
      <Route path="/news/:id"      element={<NewsOpen />} />
      <Route path="/alerts"        element={<NotificationsFullPage />} />
      <Route path="/search"        element={<SearchPage />} />
      <Route path="/profile"       element={<Profile />} />
      <Route path="/hashtag/:tag"  element={<HashtagPage />} />
      <Route path="/about"         element={<About />} />
      <Route path="/privacy"       element={<Privacy />} />
      <Route path="/terms"         element={<Terms />} />
      <Route path="/contact"       element={<Contact />} />
      <Route path="/manager"       element={<ManagerPage />} />
      <Route path="*"              element={<NotFound />} />
    </Routes>
  )
}
