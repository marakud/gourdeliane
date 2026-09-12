import { auth } from "@/auth";

// Convention Next.js 16 (`proxy.ts`, ex-`middleware.ts` -- cf.
// node_modules/next/dist/docs/.../file-conventions/proxy.md). Tourne en
// runtime Node.js par défaut dans cette version : `auth.ts` (Prisma/
// Credentials compris) peut être importé directement, aucune config
// "edge-safe" séparée n'est nécessaire ici.
export default auth;

export const config = {
  // Exclut : routes next-auth elles-mêmes, le cron (authentifié par son
  // propre secret, cf. app/api/cron/[moment]/route.ts), les assets Next.js,
  // le service worker (public/sw.js, enregistré directement par le
  // navigateur -- doit rester accessible sans session) et le manifeste PWA.
  matcher: [
    "/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico|sw.js).*)",
  ],
};
