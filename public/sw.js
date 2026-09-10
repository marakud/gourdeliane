// CartableFlow -- Service Worker minimal (Story 3.1).
//
// Rôle unique pour l'instant : recevoir un événement Push et afficher la
// notification système, puis ouvrir/focaliser l'app au clic. Volontairement
// sans cache offline ni logique d'installation -- ces sujets restent hors
// périmètre de cette story (Never de la spec 3.1).

self.addEventListener("push", (event) => {
  let payload = { title: "CartableFlow", body: "" };
  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch {
    // Corps non-JSON (improbable, on envoie toujours du JSON côté serveur) --
    // affiche quand même une notification générique plutôt que de ne rien
    // afficher silencieusement.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "CartableFlow", {
      body: payload.body || "",
      icon: "/next.svg",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientsList) => {
      for (const client of clientsList) {
        if ("focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("/");
      }
    })
  );
});
