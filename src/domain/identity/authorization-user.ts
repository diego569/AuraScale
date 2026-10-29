export const USER_ROLES = ["CLIENT", "MODERATOR", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = [
  "PENDING_ACTIVATION",
  "ACTIVE",
  "SUSPENDED",
  "DISABLED",
] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export interface AuthorizationUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  passwordChangedAt?: Date | null;
}

export interface SessionPrincipal {
  userId: string;
  issuedAtSeconds?: number;
}
