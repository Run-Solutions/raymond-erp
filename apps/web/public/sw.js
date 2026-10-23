// Service worker de autolimpieza.
// Esta aplicación no usa service workers; este archivo existe para que un
// registro viejo (por ejemplo, de otra app servida en el mismo origen/puerto)
// se actualice y se desregistre en lugar de entrar al router de locales.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.registration.unregister());
});
