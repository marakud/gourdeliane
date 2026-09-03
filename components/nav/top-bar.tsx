import Link from "next/link";
import { Settings } from "lucide-react";

// Barre superieure minimale : logo/nom de l'app + acces a Reglages.
// Reglages est volontairement hors de la barre de navigation basse a 3 onglets
// (cf. components/nav/bottom-nav.tsx) mais doit rester accessible -- c'est le
// role de ce lien.
export function TopBar() {
  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3">
      <span className="font-heading text-lg font-semibold text-primary">
        CartableFlow
      </span>
      <Link
        href="/reglages"
        aria-label="Reglages"
        className="flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Settings aria-hidden="true" className="size-6" />
      </Link>
    </header>
  );
}
