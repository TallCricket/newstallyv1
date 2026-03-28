import { Routes, Route } from 'react-router-dom'
import Socialgati            from './pages/Socialgati'
import NewsTally             from './pages/NewsTally'
import Shorts                from './pages/Shorts'
import NewsOpen              from './pages/NewsOpen'
import CategoryPage          from './pages/CategoryPage'
import NotificationsFullPage from './pages/NotificationsFullPage'
import Profile               from './pages/Profile'
import UserProfilePage       from './pages/UserProfilePage'
import HashtagPage           from './pages/HashtagPage'
import SearchPage            from './pages/SearchPage'
import ManagerPage           from './pages/ManagerPage'
import { About, Privacy, Terms, Contact } from './pages/StaticPages'
import NotFound              from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      {/* Home */}
      <Route path="/"                        element={<Socialgati />} />

      {/* ⚠️ Category route MUST come before /news/:id so it doesn't get swallowed */}
      <Route path="/news/category/:cat"      element={<CategoryPage />} />
      <Route path="/news/:id"                element={<NewsOpen />} />
      <Route path="/news"                    element={<NewsTally />} />

      {/* Shorts */}
      <Route path="/shorts"                  element={<Shorts />} />

      {/* Notifications */}
      <Route path="/alerts"                  element={<NotificationsFullPage />} />

      {/* Search */}
      <Route path="/search"                  element={<SearchPage />} />

      {/* Own profile vs public @username profile */}
      <Route path="/profile"                 element={<Profile />} />
      <Route path="/@:username"              element={<UserProfilePage />} />
      <Route path="/u/:username"             element={<UserProfilePage />} />

      {/* Hashtag feed */}
      <Route path="/hashtag/:tag"            element={<HashtagPage />} />

      {/* Static */}
      <Route path="/about"                   element={<About />} />
      <Route path="/privacy"                 element={<Privacy />} />
      <Route path="/terms"                   element={<Terms />} />
      <Route path="/contact"                 element={<Contact />} />

      {/* Manager */}
      <Route path="/manager"                 element={<ManagerPage />} />

      <Route path="*"                        element={<NotFound />} />
    </Routes>
  )
}
