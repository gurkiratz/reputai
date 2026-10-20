import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Deliberately built from the edge-safe authConfig (no providers, no
// Prisma) rather than importing `auth` from "@/auth" — see auth.config.ts.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
