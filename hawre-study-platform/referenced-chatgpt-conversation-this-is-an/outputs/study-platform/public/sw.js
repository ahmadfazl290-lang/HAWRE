const CACHE = 'hawre-shell-v2';
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const response = await fetch('/', { cache: 'reload' });
    if (!response.ok) throw new Error('Shell unavailable');
    const html = await response.text();
    const assets = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g)].map(m => m[1]);
    await cache.put('/', new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
    await cache.addAll([...assets, '/manifest.webmanifest', '/icon.svg']);
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await Promise.all((await caches.keys()).filter(k => k.startsWith('hawre-shell-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      if (response.ok && (url.pathname === '/' || /^\/assets\/[^/]+\.(js|css)$/.test(url.pathname) || ['/icon.svg','/manifest.webmanifest'].includes(url.pathname))) {
        const cache = await caches.open(CACHE);
        await cache.put(event.request,response.clone());
      }
      return response;
    } catch {
      const cached = await caches.match(event.request);
      return cached || (event.request.mode === 'navigate' ? await caches.match('/') : Response.error());
    }
  })());
});
