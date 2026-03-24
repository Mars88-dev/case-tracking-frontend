self.addEventListener("install", () => {
    self.skipWaiting();
  });
  
  self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
  });
  
  self.addEventListener("notificationclick", (event) => {
    event.notification.close();
  
    const targetUrl = event.notification?.data?.url || "/messages";
  
    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            client.postMessage({
              type: "notification-click",
              userId: event.notification?.data?.userId || "",
            });
            return client.focus();
          }
        }
  
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
  
        return undefined;
      })
    );
  });
  