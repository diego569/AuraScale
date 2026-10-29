import "server-only";

import argon2 from "argon2";

import { createCredentialAuthenticator } from "@/auth/credential-authenticator";
import { authenticationRepository } from "@/repositories/authentication-repository";

// A valid hash used only to equalize the expensive verification path when an
// email is unknown. It never grants access and is not associated with a user.
const MISSING_USER_HASH =
  "$argon2id$v=19$m=65536,p=4,t=3$qDvKI+42XSjnWoQaM8neLQ$ayHTFDr/4G7dmv2e8opXJVQjf2h/WWNYljzyiEdH66E";

export const authenticateCredentials = createCredentialAuthenticator({
  ...authenticationRepository,
  verifyPassword(passwordHash, password) {
    return argon2.verify(passwordHash, password);
  },
  async consumeMissingUserPassword(password) {
    try {
      await argon2.verify(MISSING_USER_HASH, password);
    } catch {
      // The dummy comparison result is intentionally ignored.
    }
  },
  now: () => new Date(),
});
