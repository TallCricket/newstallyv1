import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase/config'

// Time ago
export function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (isNaN(diff) || diff < 0) return ''
  if (diff < 60) return 'Just now'
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago'
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago'
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// Format count
export function formatCount(n) {
  if (!n) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

// Toast
let _toastTimer = null
export function showToast(msg) {
  let el = document.getElementById('nt-toast')
  if (!el) {
    el = document.createElement('div')
    el.id = 'nt-toast'
    el.className = 'toast'
    document.body.appendChild(el)
  }
  el.textContent = msg
  el.classList.add('show')
  clearTimeout(_toastTimer)
  _toastTimer = setTimeout(() => el.classList.remove('show'), 2500)
}

// Category icon
export function catIcon(cat) {
  const m = {
    Cricket: 'fas fa-cricket-bat-ball',
    Sports: 'fas fa-futbol',
    Technology: 'fas fa-microchip',
    Business: 'fas fa-chart-line',
    Health: 'fas fa-heart-pulse',
    Education: 'fas fa-graduation-cap',
    National: 'fas fa-flag',
    World: 'fas fa-globe',
    General: 'fas fa-newspaper',
    Entertainment: 'fas fa-film',
    Politics: 'fas fa-landmark',
  }
  return m[cat] || 'fas fa-newspaper'
}

// Send notification
export async function sendNotification(toUid, { type, fromName, fromAvatar, fromUid, message, postId = '', postSnippet = '' }) {
  if (!toUid || toUid === fromUid) return
  try {
    await addDoc(collection(db, 'users', toUid, 'notifications'), {
      type, fromUid, fromName,
      fromAvatar: fromAvatar || '',
      message, postId, postSnippet,
      read: false,
      timestamp: serverTimestamp()
    })
  } catch(e) { /* silent */ }
}

// Process text {"\u2014"} hashtags and mentions
export function processText(text) {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/#(\w+)/g, '<span style="color:#1a73e8;font-weight:600">#$1</span>')
    .replace(/@(\w+)/g, '<span style="color:#9334e6;font-weight:600">@$1</span>')
}

// Slug generator for SEO-friendly news URLs
export function makeSlug(title) {
  if (!title) return 'news'
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80) || 'news'
}

// Build SEO-friendly URL: /news/{firestoreId}-{slug}
// Firestore auto-IDs are always 20 alphanumeric chars (no hyphens)
// So extracting the ID is: slug.substring(0, 20)
export function makeNewsUrl(item) {
  return `/news/${item.id}-${makeSlug(item.title)}`
}
