const CACHE_NAME = "pvc-v2"
const PRECACHE = ["/", "/community"]

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  )
  self.skipWaiting()
})

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return

  const url = new URL(e.request.url)

  // Cache-first for static assets (images, fonts, CSS, JS bundles)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/flags/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.match(/\.(png|jpg|jpeg|webp|avif|gif|svg|woff2?|ttf|css|js)$/)
  ) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached
        return fetch(e.request).then((res) => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone))
          return res
        })
      })
    )
    return
  }

  // Network-first for dynamic content (pages, API)
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (url.pathname.startsWith("/api/")) return res
        const clone = res.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone))
        return res
      })
      .catch(() => caches.match(e.request))
  )
})
