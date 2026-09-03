import Link from "next/link";
import { Settings } from "lucide-react";

// Barre supérieure minimale : logo/nom de l'app + accès à Réglages.
// Réglages est volontairement hors de la barre de navigation basse à 3 onglets
// (cf. components/nav/bottom-nav.tsx) mais doit rester accessible -- c'est le
// rôle de ce lien.
export function TopBar() {
  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3">
      <span className="font-heading text-lg font-semibold text-primary">
        CartableFlow
      </span>
      <Link
        href="/reglages"
        aria-label="Réglages"
        className="flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Settings aria-hidden="true" className="size-6" />
      </Link>
    </header>
  );
}
