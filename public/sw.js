/* Evaclear service worker: makes the site installable and keeps it usable on a weak connection.
   Pages: network first, then the last saved copy, then /offline.html.
   Images, scripts, styles and fonts: served from cache and refreshed in the background.
   Never cached: accounts (Supabase), payments (Paystack/Flutterwave), WhatsApp and anything that isn't a GET. */
const VERSION = 'evaclear-v1'
const PAGES = `${VERSION}-pages`
const ASSETS = `${VERSION}-assets`
const PRECACHE = ['/', '/offline.html', '/favicon.svg', '/icons/icon-192.png']
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(PAGES).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i])
}

async function networkFirst(request) {
  const cache = await caches.open(PAGES)
  try {
    const res = await fetch(request)
    if (res.ok && res.type === 'basic') {
      cache.put(request, res.clone())
      trim(PAGES, 60)
    }
    return res
  } catch {
    return (await cache.match(request, { ignoreSearch: true })) || (await cache.match('/offline.html'))
  }
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(ASSETS)
  const cached = await cache.match(event.request)
  const refresh = fetch(event.request)
    .then((res) => {
      if (res.ok || res.type === 'opaque') {
        cache.put(event.request, res.clone())
        trim(ASSETS, 200)
      }
      return res
    })
    .catch(() => cached)
  if (cached) {
    event.waitUntil(refresh)
    return cached
  }
  return refresh
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  const sameOrigin = url.origin === self.location.origin

  if (request.mode === 'navigate' && sameOrigin) {
    // Admin and account pages always come from the network.
    if (url.pathname.startsWith('/admin')) return
    event.respondWith(networkFirst(request))
    return
  }
  if (sameOrigin && /\.(?:js|css|webp|png|jpe?g|svg|gif|ico|woff2?|json)$/.test(url.pathname) && !url.pathname.endsWith('/sw.js')) {
    event.respondWith(staleWhileRevalidate(event))
    return
  }
  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(event))
  }
  // Everything else (Supabase, Paystack, WhatsApp, analytics…) goes straight to the network.
})
