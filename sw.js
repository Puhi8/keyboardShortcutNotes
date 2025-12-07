const CACHE_NAME = 'keyboard-notes-cache-v1'

self.addEventListener('install', (event) => {
   self.skipWaiting()
})

self.addEventListener('activate', (event) => {
   event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
   if (event.request.method !== 'GET') return
   const url = new URL(event.request.url)
   if (url.origin !== self.location.origin) return

   event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
         const cached = await cache.match(event.request)
         if (cached) return cached

         try {
            const response = await fetch(event.request)
            cache.put(event.request, response.clone())
            return response
         }
         catch (err) { return cached || Promise.reject(err) }
      })
   )
})
