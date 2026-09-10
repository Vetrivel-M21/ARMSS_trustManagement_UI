import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Same "shared secret baked into the desktop app" tradeoff already accepted
// for the backend's device-token API gate (see TrustAppClient in
// mis_desktop) — not a cryptographic boundary, just enough to make a plain
// browser hitting this URL get a 404 instead of the app shell. The backend's
// RequireDeviceToken middleware independently still blocks every API call
// regardless of this gate.
const DESKTOP_ENTRY_SECRET = '625456a6f1033e996aa558a1b706961e4513c86915f921207ce031a91bf3f782'
const ENTRY_COOKIE = 'trust_portal_entry'
// Matches the backend device token's own TTL (DeviceTokenTTL in
// backend/internal/device/service.go) — without this, the cookie would
// outlive the token it's meant to track, letting the page shell keep loading
// in this browser long after the API calls it needs have started failing.
const ENTRY_COOKIE_MAX_AGE_SECONDS = 15 * 60

function desktopOnlyGate(): Plugin {
  return {
    name: 'desktop-only-gate',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')

        // This is a single-page app — Vite serves the same index.html shell
        // for ANY path that isn't a real static asset (e.g. /dashboard would
        // load the shell just like / does), so gating only the literal '/'
        // left every other route wide open. Bypass the gate only for actual
        // asset/module/dev-server-internal requests; everything else (any
        // page route a browser could be typed into) gets checked.
        const isAssetOrDevInternal =
          url.pathname.startsWith('/@vite') ||
          url.pathname.startsWith('/@react-refresh') ||
          url.pathname.startsWith('/@fs') ||
          url.pathname.startsWith('/@id') ||
          url.pathname.startsWith('/src/') ||
          url.pathname.startsWith('/node_modules/') ||
          /\.[a-zA-Z0-9]+$/.test(url.pathname)

        if (isAssetOrDevInternal) {
          return next()
        }

        const cookies = req.headers.cookie ?? ''
        const hasEntryCookie = cookies.split(';').some((c) => c.trim() === `${ENTRY_COOKIE}=1`)
        const suppliedSecret = url.searchParams.get('entry_secret')

        if (hasEntryCookie || suppliedSecret === DESKTOP_ENTRY_SECRET) {
          if (suppliedSecret === DESKTOP_ENTRY_SECRET) {
            res.setHeader('Set-Cookie', `${ENTRY_COOKIE}=1; Path=/; Max-Age=${ENTRY_COOKIE_MAX_AGE_SECONDS}; HttpOnly; SameSite=Lax`)
          }
          return next()
        }

        res.statusCode = 404
        res.setHeader('Content-Type', 'text/plain')
        res.end('404 Not Found')
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    desktopOnlyGate(),
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    host: true,
  },
})
