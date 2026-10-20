import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: Role;
    organizationId: string;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      organizationId: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    organizationId: string;
  }
}

// NextAuthConfig's callback types (via @auth/core) resolve JWT from
// "@auth/core/jwt" directly rather than the "next-auth/jwt" re-export, so
// the augmentation above alone doesn't reach `token` inside auth.config.ts —
// it has to be declared against this module specifier too.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    organizationId: string;
  }
}
