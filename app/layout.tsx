import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import { TopBar } from "@/components/nav/top-bar";
import { BottomNav } from "@/components/nav/bottom-nav";
import "./globals.css";

// Baloo 2 -- display/heading font (UX-DR1)
const baloo2 = Baloo_2({
  variable: "--font-heading",
  subsets: ["latin"],
});

// Nunito -- body/meta font (UX-DR2)
const nunito = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CartableFlow",
  description: "CartableFlow",
};

// Refonte visuelle étape 5 -- viewportFit "cover" requis pour que
// `env(safe-area-inset-bottom)` (utilisé par components/nav/bottom-nav.tsx)
// résolve une vraie valeur sur iPhone (encoche/barre d'accueil) plutôt que 0 ;
// sans lui Safari n'étend jamais le viewport sous ces zones.
export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${baloo2.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-surface-base">
        <TopBar />
        <main className="flex-1">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
