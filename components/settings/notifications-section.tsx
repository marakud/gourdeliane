"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ActionResult, PushSubscriptionInput } from "@/actions/push";

// Story 3.1 -- section Réglages pour activer les rappels quotidiens (Web
// Push). Ce composant ne décide jamais lui-même du contenu/de l'heure d'un
// rappel (domain/notifications.ts, app/api/cron/[moment]/route.ts) -- son
// seul rôle est l'abonnement navigateur et sa persistance côté serveur.

export interface NotificationsSectionProps {
  /** Clé publique VAPID, lue côté serveur (jamais NEXT_PUBLIC_) et transmise
   * en prop -- voir .env.example. */
  vapidPublicKey: string;
  onSubscribe: (input: PushSubscriptionInput) => Promise<ActionResult<null>>;
}

type Status = "checking" | "unsupported" | "idle" | "subscribing" | "subscribed" | "denied" | "error";

// Conversion standard base64url -> Uint8Array, requise par
// `pushManager.subscribe({ applicationServerKey })` qui n'accepte pas
// directement une chaîne -- boilerplate Web Push habituel, pas spécifique à
// ce projet.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationsSection({
  vapidPublicKey,
  onSubscribe,
}: NotificationsSectionProps) {
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Tout passe par une continuation asynchrone (jamais un `setState`
    // synchrone au corps de l'effet, y compris pour les cas "non supporté"/
    // "refusé") -- uniquement pour satisfaire la règle de lint sur les
    // rendus en cascade, le comportement reste identique.
    async function resolveInitialStatus(): Promise<Status> {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        return "unsupported";
      }
      // Tout le reste dans un seul try/catch (y compris la lecture de
      // `Notification.permission`) : un environnement où `serviceWorker`/
      // `PushManager` existent mais pas `Notification` ne doit jamais laisser
      // `status` bloqué sur "checking" indéfiniment.
      try {
        if (Notification.permission === "denied") {
          return "denied";
        }
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        return subscription ? "subscribed" : "idle";
      } catch {
        return "idle";
      }
    }

    resolveInitialStatus().then((next) => {
      if (!cancelled) setStatus(next);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleActivate() {
    setError(null);
    setStatus("subscribing");

    try {
      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setStatus("denied");
        return;
      }
      if (permission !== "granted") {
        // "default" : l'utilisateur a fermé la popup sans choisir --
        // contrairement à "denied" (refus explicite, nécessite un geste dans
        // les réglages du navigateur), il peut réessayer directement en
        // recliquant sur "Activer les rappels".
        setError("Active les notifications pour continuer, puis réessaie.");
        setStatus("idle");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Abonnement incomplet.");
      }

      const result = await onSubscribe({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
      if (!result.ok) {
        setError(result.error);
        setStatus("error");
        return;
      }
      setStatus("subscribed");
    } catch (err) {
      console.error("Activation des rappels échouée:", err);
      setError("Impossible d'activer les rappels. Réessaie.");
      setStatus("error");
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-border">
      <div>
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Rappels
        </h2>
        <p className="text-sm text-muted-foreground">
          Reçois une notification le matin, au retour et le soir pour ne pas
          oublier tes checklists.
        </p>
      </div>

      {status === "checking" && (
        <p className="text-sm text-muted-foreground">Vérification...</p>
      )}

      {status === "unsupported" && (
        <p className="text-sm text-muted-foreground">
          Les rappels ne sont pas disponibles sur ce navigateur/appareil.
        </p>
      )}

      {status === "subscribed" && (
        <p className="text-sm font-medium text-success">
          Rappels activés sur cet appareil.
        </p>
      )}

      {status === "denied" && (
        <p className="text-sm text-muted-foreground">
          La permission de notification a été refusée. Autorise les
          notifications pour ce site dans les réglages de ton navigateur pour
          activer les rappels.
        </p>
      )}

      {(status === "idle" || status === "subscribing" || status === "error") && (
        <Button
          type="button"
          onClick={handleActivate}
          disabled={status === "subscribing"}
          className="h-11 min-w-[44px] self-start"
        >
          {status === "subscribing" ? "Activation..." : "Activer les rappels"}
        </Button>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
