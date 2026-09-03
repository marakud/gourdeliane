import type { Metadata } from "next";
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
