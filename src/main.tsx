import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { DeviceAccessDenied } from './components/DeviceAccessDenied'
import './index.css'

// Picked up when the desktop app opens this page in a real browser (see
// mis_desktop's TrustPortalScreen "Open in Browser" button) — the embedded
// WebView case injects this directly into sessionStorage instead and never
// hits this URL param path. sessionStorage (not localStorage) so a sibling
// tab in the same browser doesn't inherit it just by sharing an origin.
const deviceTokenFromUrl = new URLSearchParams(window.location.search).get('device_token')
if (deviceTokenFromUrl) {
  sessionStorage.setItem('device_token', deviceTokenFromUrl)
  // Scrub the token (and entry_secret) out of the visible address bar/history
  // now that it's stored.
  window.history.replaceState({}, '', window.location.pathname + window.location.hash)
}

// The Vite dev-server gate (or, in production, whatever serves these static
// files) only protects the very first page request. This is a second,
// client-side check so the real app — including the login form — never even
// mounts without a device token, instead of falling through to a login
// screen that would just fail on submit.
const hasDeviceToken = !!sessionStorage.getItem('device_token')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {hasDeviceToken ? <App /> : <DeviceAccessDenied />}
  </React.StrictMode>,
)
