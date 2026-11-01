/* Sugarcane Juice Owner — service worker.
 * Caches the app shell for offline start; API calls are never cached.
 * Also handles Web Push: display order notifications, open app on tap.
 */
const CACHE = "kunal-admin-v1";
const SHELL = ["/", "/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

/* -------- Web Push -------- */

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "New Order!", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Sugarcane Juice";
  const options = {
    body: payload.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    vibrate: [120, 60, 120],
    data: payload.data || { url: "/admin/orders" },
    tag: "owner-order"
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Broadcasts carry data.url = "/" (customer homepage); order pings carry
  // "/orders" (admin). Falls back to the admin orders page.
  let url = event.notification.data?.url || "/admin/orders";
  if (!url.startsWith("/")) url = "/" + url;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          try {
            client.navigate(url);
            return client.focus();
          } catch {
            // fall through to openWindow
          }
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

/* -------- Fetch caching -------- */

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only same-origin GETs. Never touch API or uploaded content.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/uploads/")) return;
  if (request.method !== "GET") return;

  // Navigations: network-first, fall back to cached shell.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put("/index.html", copy));
          return response;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Static assets: cache-first, then network and store.
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
    )
  );
});
