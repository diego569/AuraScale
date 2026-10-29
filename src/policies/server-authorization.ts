import "server-only";

import { getSessionPrincipal } from "@/auth/server-session";
import { getPrisma } from "@/lib/db";
import { createAuthorizationGuards } from "@/policies/authorization";

const guards = createAuthorizationGuards({
  getSessionPrincipal,
  async findCurrentUser(userId) {
    const user = await getPrisma().user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        passwordCredential: { select: { passwordChangedAt: true } },
      },
    });

    if (!user) return null;

    const { passwordCredential, ...rest } = user;
    return { ...rest, passwordChangedAt: passwordCredential?.passwordChangedAt ?? null };
  },
});

export const requireAuthenticatedUser = guards.requireAuthenticatedUser;
export const requireActiveUser = guards.requireActiveUser;
export const requireModerator = () =>
  guards.requireActiveUser({ roles: ["MODERATOR", "ADMIN"] });
