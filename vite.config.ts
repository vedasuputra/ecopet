import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Dev only: serve the Vercel-style functions in /api under `npm run dev`, so the chat and photo
// verification work locally without `vercel dev`. Server-only env vars (no VITE_ prefix, e.g.
// GEMINI_API_KEY) are loaded from .env.local into process.env for those functions only.
function localApi(mode: string): Plugin {
  return {
    name: 'local-api',
    apply: 'serve',
    configureServer(server) {
      for (const [k, v] of Object.entries(loadEnv(mode, process.cwd(), ''))) {
        if (process.env[k] === undefined) process.env[k] = v
      }
      server.middlewares.use(async (req, res, next) => {
        const m = req.url?.match(/^\/api\/([a-z0-9-]+)(?:\?.*)?$/i)
        if (!m || m[1].startsWith('_')) return next()

        let raw = ''
        for await (const chunk of req) raw += chunk
        let body: unknown
        try {
          body = raw ? JSON.parse(raw) : undefined
        } catch {
          body = undefined
        }

        const out = {
          status(code: number) {
            res.statusCode = code
            return out
          },
          json(data: unknown) {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(data))
          },
        }

        try {
          const mod = await server.ssrLoadModule(`/api/${m[1]}.ts`)
          await mod.default({ method: req.method, body, headers: req.headers }, out)
        } catch (e) {
          console.error('[local-api]', e)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: 'server_error' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    localApi(mode),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'meilu-logo.png'],
      manifest: {
        name: 'Eco-Pet',
        short_name: 'Eco-Pet',
        description: 'Ekowisata Mekong Delta bersama Meilu',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // SPA fallback, but never for serverless API calls
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
}))
