// Service worker mínimo: deixa o app instalável e abre a tela inicial mesmo com internet fraca.
// Os dados sempre vêm do Supabase, então só guardamos os arquivos do próprio app.
const CACHE = 'clienteconecta-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((chaves) => Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return
  // Rede primeiro; se cair, usa a última cópia guardada.
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok) {
          const copia = r.clone()
          caches.open(CACHE).then((c) => c.put(e.request, copia))
        }
        return r
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('/'))),
  )
})
