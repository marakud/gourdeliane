import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/data/prisma";

// Config Auth.js unique -- pas de scission edge/Node : dans cette version de
// Next.js (16), `proxy.ts` (ex-`middleware.ts`) tourne par défaut en runtime
// Node.js (cf. node_modules/next/dist/docs/.../file-conventions/proxy.md,
// "Proxy defaults to using the Node.js runtime"), donc pas besoin d'isoler
// le provider Credentials (qui a besoin de Prisma) d'une config "edge-safe"
// séparée comme sur les versions antérieures de Next.js/Auth.js.
export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    // Appelé par proxy.ts à chaque requête -- décide de l'accès.
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);
      const { pathname } = request.nextUrl;
      const isAuthPage = pathname === "/login" || pathname === "/signup";

      if (isAuthPage) {
        // Déjà connecté : inutile de revoir le formulaire de connexion.
        if (isLoggedIn) {
          return Response.redirect(new URL("/", request.nextUrl));
        }
        return true;
      }

      return isLoggedIn;
    },
    // `user.id` (résolu par `authorize` ci-dessous) -> `token.userId` ->
    // exposé sur `session.user.id`. Sans ce relais explicite, `session.user`
    // ne porterait que les champs standard (email), jamais l'id applicatif
    // dont toutes les pages/actions ont besoin (lib/current-user.ts).
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.userId === "string") {
        session.user.id = token.userId;
      }
      return session;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) return null;

        return { id: user.id, email: user.email };
      },
    }),
  ],
});
