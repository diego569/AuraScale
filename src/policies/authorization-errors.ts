export class AuthorizationError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly httpStatus: 401 | 403,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class AuthenticationRequiredError extends AuthorizationError {
  constructor() {
    super("Authentication is required.", "AUTHENTICATION_REQUIRED", 401);
  }
}

export class SessionInvalidatedError extends AuthorizationError {
  constructor() {
    super(
      "This session was issued before the most recent password change. Please sign in again.",
      "SESSION_INVALIDATED",
      401,
    );
  }
}

export class ActivationRequiredError extends AuthorizationError {
  constructor() {
    super("Account activation is required.", "ACTIVATION_REQUIRED", 403);
  }
}

export class AccountUnavailableError extends AuthorizationError {
  constructor(status: "SUSPENDED" | "DISABLED") {
    super(`Account is ${status.toLowerCase()}.`, "ACCOUNT_UNAVAILABLE", 403);
  }
}

export class RoleForbiddenError extends AuthorizationError {
  constructor() {
    super("The authenticated user does not have the required role.", "ROLE_FORBIDDEN", 403);
  }
}
