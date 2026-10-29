import type {
  AuthorizationUser,
  SessionPrincipal,
  UserRole,
} from "@/domain/identity/authorization-user";
import {
  AccountUnavailableError,
  ActivationRequiredError,
  AuthenticationRequiredError,
  RoleForbiddenError,
  SessionInvalidatedError,
} from "@/policies/authorization-errors";

export interface AuthorizationDependencies {
  getSessionPrincipal(): Promise<SessionPrincipal | null>;
  findCurrentUser(userId: string): Promise<AuthorizationUser | null>;
}

export interface ActiveUserRequirement {
  roles?: readonly UserRole[];
}

export function createAuthorizationGuards(dependencies: AuthorizationDependencies) {
  async function requireAuthenticatedUser(): Promise<AuthorizationUser> {
    const principal = await dependencies.getSessionPrincipal();
    if (!principal) {
      throw new AuthenticationRequiredError();
    }

    const user = await dependencies.findCurrentUser(principal.userId);
    if (!user) {
      throw new AuthenticationRequiredError();
    }

    if (
      principal.issuedAtSeconds !== undefined &&
      user.passwordChangedAt &&
      principal.issuedAtSeconds * 1000 < user.passwordChangedAt.getTime()
    ) {
      throw new SessionInvalidatedError();
    }

    if (user.status === "SUSPENDED" || user.status === "DISABLED") {
      throw new AccountUnavailableError(user.status);
    }

    return user;
  }

  async function requireActiveUser(
    requirement: ActiveUserRequirement = {},
  ): Promise<AuthorizationUser> {
    const user = await requireAuthenticatedUser();

    if (user.status === "PENDING_ACTIVATION") {
      throw new ActivationRequiredError();
    }

    if (user.status !== "ACTIVE") {
      throw new AccountUnavailableError(user.status);
    }

    if (requirement.roles && !requirement.roles.includes(user.role)) {
      throw new RoleForbiddenError();
    }

    return user;
  }

  return { requireAuthenticatedUser, requireActiveUser };
}
