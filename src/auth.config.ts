import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config: pages + callbacks only, no providers.
 * Middleware imports this (not `auth.ts`) so it never pulls in Prisma /
 * bcryptjs — those are Node-only and would break the Edge middleware bundle.
 * `auth.ts` extends this with the actual Credentials provider for use in
 * Server Components, Server Actions, and the route handler.
 */
export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.organizationId = user.organizationId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.organizationId = token.organizationId;
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isPublic = pathname === "/" || pathname.startsWith("/login");
      return isPublic || Boolean(auth?.user);
    },
  },
};
