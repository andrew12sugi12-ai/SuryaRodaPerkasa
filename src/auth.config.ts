import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  // Shorter sessions for a finance app: a stale browser on a shared PC
  // should not stay logged in for weeks. 1 day, refreshed on activity.
  session: { strategy: "jwt", maxAge: 60 * 60 * 24, updateAge: 60 * 60 },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "BOOKKEEPER";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
