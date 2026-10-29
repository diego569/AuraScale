import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import { authenticateCredentials } from "@/auth/authenticate";

const loginSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(1).max(128),
});

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(input) {
        const parsed = loginSchema.safeParse(input);
        if (!parsed.success) return null;

        const user = await authenticateCredentials(parsed.data);
        if (!user) return null;

        // PENDING_ACTIVATION is intentionally allowed to authenticate.
        return {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId;
      }
      if (typeof token.iat === "number") {
        session.issuedAtSeconds = token.iat;
      }
      return session;
    },
  },
};
