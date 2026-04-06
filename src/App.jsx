import { Routes, Route } from 'react-router-dom'
import Socialgati            from './pages/Socialgati'
import NewsTally             from './pages/NewsTally'
import Shorts                from './pages/Shorts'
import LiveNews              from './pages/LiveNews'
import RedditCommunity       from './pages/RedditCommunity'
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
      {/* Community */}
      <Route path="/"                       element={<Socialgati />} />

      {/* News */}
      <Route path="/news"                   element={<NewsTally />} />
      <Route path="/news/:id"               element={<NewsOpen />} />
      <Route path="/news/category/:cat"     element={<CategoryPage />} />

      {/* Shorts */}
      <Route path="/shorts"                 element={<Shorts />} />

      {/* Live News */}
      <Route path="/live"                   element={<LiveNews />} />

      {/* Reddit Community */}
      <Route path="/community"              element={<RedditCommunity />} />

      {/* Alerts */}
      <Route path="/alerts"                 element={<NotificationsFullPage />} />

      {/* Search */}
      <Route path="/search"                 element={<SearchPage />} />

      {/* Profiles {"\u2014"} /profile = own, /u/:username = public */}
      <Route path="/profile"               element={<Profile />} />
      <Route path="/u/:username"           element={<UserProfilePage />} />

      {/* Hashtags */}
      <Route path="/hashtag/:tag"          element={<HashtagPage />} />

      {/* Static pages */}
      <Route path="/about"                 element={<About />} />
      <Route path="/privacy"              element={<Privacy />} />
      <Route path="/terms"                element={<Terms />} />
      <Route path="/contact"              element={<Contact />} />

      {/* Manager */}
      <Route path="/manager"              element={<ManagerPage />} />

      <Route path="*"                     element={<NotFound />} />
    </Routes>
  )
}
