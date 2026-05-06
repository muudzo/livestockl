import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command, mode }) => {
  // Fail the production build loudly when Supabase credentials are missing,
  // so we never ship a build that silently falls back to mock data in prod.
  // Set ALLOW_MISSING_SUPABASE_ENV=1 to bypass (e.g. static preview builds).
  if (command === 'build' && mode === 'production') {
    const env = loadEnv(mode, process.cwd(), '');
    const bypass = env.ALLOW_MISSING_SUPABASE_ENV === '1' || process.env.ALLOW_MISSING_SUPABASE_ENV === '1';
    const hasUrl = Boolean(env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL);
    const hasKey = Boolean(env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);
    if (!bypass && (!hasUrl || !hasKey)) {
      throw new Error(
        '[vite] Production build aborted: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set. ' +
        'Set them in the deploy environment, or pass ALLOW_MISSING_SUPABASE_ENV=1 to build in demo mode.'
      );
    }
  }

  return {
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'offline.html', 'icons/apple-touch-icon.png'],
      manifest: {
        id: '/?source=pwa',
        name: 'Mimoo — Buy & Sell Livestock',
        short_name: 'Mimoo',
        description: 'Zimbabwe\'s premier livestock marketplace. Buy, sell, and auction cattle, goats, and more. 米牧智慧農務',
        theme_color: '#d4a843',
        background_color: '#f5f5dc',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['business', 'shopping'],
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Force the new SW to activate immediately on deploy, take control of
        // all open tabs, and purge old precache entries. main.tsx pairs this
        // with a controllerchange listener that reloads the page so users
        // always see the latest bundle without having to clear PWA data.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // SPA fallback: every navigation that isn't /api or /auth or an
        // /assets/* file should resolve to the precached index.html shell so
        // React Router can handle the client-side route. Earlier this was
        // pointing at /offline.html which made every dynamic route (e.g.
        // /item/<id>) render the offline page even on a healthy network.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/auth/, /^\/assets\//],
        // Cache strategies for different resource types
        runtimeCaching: [
          {
            // Cache Supabase storage images (livestock photos)
            urlPattern: /^https:\/\/hmeieslclzycyjjjflfh\.supabase\.co\/storage/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'livestock-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
              },
            },
          },
          {
            // Cache API calls with network-first strategy
            urlPattern: /^https:\/\/hmeieslclzycyjjjflfh\.supabase\.co\/rest/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60, // 5 minutes
              },
            },
          },
          {
            // Cache Google Fonts
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
              },
            },
          },
        ],
        // Don't precache large assets
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MB
      },
    }),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      include: ['src/hooks/**', 'src/stores/**'],
    },
  },
  };
})
