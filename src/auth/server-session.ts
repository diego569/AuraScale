import "server-only";

import { getServerSession } from "next-auth";

import { authOptions } from "@/auth/auth-options";

export async function getSessionPrincipal() {
  const session = await getServerSession(authOptions);
  return session?.user?.id
    ? { userId: session.user.id, issuedAtSeconds: session.issuedAtSeconds }
    : null;
}
