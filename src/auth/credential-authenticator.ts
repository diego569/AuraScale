import type { AuthorizationUser } from "@/domain/identity/authorization-user";

export interface CredentialRecord {
  user: AuthorizationUser;
  passwordHash: string;
  failedAttempts: number;
  lockedUntil: Date | null;
}

export interface CredentialAuthenticatorDependencies {
  findByNormalizedEmail(email: string): Promise<CredentialRecord | null>;
  verifyPassword(passwordHash: string, password: string): Promise<boolean>;
  consumeMissingUserPassword(password: string): Promise<void>;
  recordFailure(userId: string): Promise<void>;
  clearFailures(userId: string): Promise<void>;
  now(): Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function createCredentialAuthenticator(
  dependencies: CredentialAuthenticatorDependencies,
) {
  return async function authenticateCredentials(
    credentials: LoginCredentials,
  ): Promise<AuthorizationUser | null> {
    const record = await dependencies.findByNormalizedEmail(
      normalizeEmail(credentials.email),
    );

    if (!record) {
      await dependencies.consumeMissingUserPassword(credentials.password);
      return null;
    }

    if (record.lockedUntil && record.lockedUntil > dependencies.now()) {
      return null;
    }

    const passwordMatches = await dependencies.verifyPassword(
      record.passwordHash,
      credentials.password,
    );

    if (!passwordMatches) {
      await dependencies.recordFailure(record.user.id);
      return null;
    }

    if (record.user.status === "SUSPENDED" || record.user.status === "DISABLED") {
      return null;
    }

    await dependencies.clearFailures(record.user.id);
    return record.user;
  };
}
