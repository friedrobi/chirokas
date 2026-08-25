// Minimale service worker — enkel nodig zodat browsers "installeren als app" aanbieden.
// Geen offline-caching: de app heeft sowieso een live verbinding met Firestore nodig.
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { self.clients.claim(); });
self.addEventListener('fetch', (e) => { /* passthrough */ });
