import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// Alerts is handled inside Socialgati/NewsTally via NotificationsPage overlay
// This page just redirects to home
export default function Alerts() {
  const navigate = useNavigate()
  useEffect(() => { navigate('/', { replace: true }) }, [])
  return null
}
