import type { DefaultSession } from "next-auth";

// `session.user.id` (résolu par le callback `session` dans auth.config.ts) --
// absent du type par défaut de next-auth, qui n'expose que les champs
// standard (email, name, image).
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
  }
}
