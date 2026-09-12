import { TopBar } from "@/components/nav/top-bar";
import { BottomNav } from "@/components/nav/bottom-nav";

// Groupe de routes des pages protégées (Accueil/EDT/Progression/Réglages) --
// TopBar/BottomNav n'y vivent qu'ici, jamais sur /login ou /signup (pages
// publiques, cf. app/layout.tsx). L'accès est déjà tranché par middleware.ts
// avant que ce layout ne s'exécute (redirection vers /login si pas de
// session) -- pas de garde supplémentaire ici.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopBar />
      <main className="flex-1">{children}</main>
      <BottomNav />
    </>
  );
}
