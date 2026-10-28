const CACHE_NAME = "grimorio-static-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/data/") ||
    !["style", "script", "image", "font"].includes(request.destination)
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type === "basic") {
          const cacheControl = response.headers.get("cache-control") ?? "";
          if (!cacheControl.includes("no-store")) {
            event.waitUntil(
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(request, response.clone()))
            );
          }
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        return cached ?? Response.error();
      })
  );
});
