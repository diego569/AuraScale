import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
    };
    issuedAtSeconds?: number;
  }

  interface User {
    role?: "CLIENT" | "MODERATOR" | "ADMIN";
    status?: "PENDING_ACTIVATION" | "ACTIVE" | "SUSPENDED" | "DISABLED";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    iat?: number;
  }
}
