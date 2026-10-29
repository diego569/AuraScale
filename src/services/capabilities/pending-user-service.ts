import type { AuthorizationUser } from "@/domain/identity/authorization-user";

export type RequireAuthenticatedUser = () => Promise<AuthorizationUser>;

export class PendingUserService {
  constructor(private readonly requireAuthenticatedUser: RequireAuthenticatedUser) {}

  async getActivationStatus() {
    const user = await this.requireAuthenticatedUser();
    return { userId: user.id, status: user.status };
  }

  async getProfileCorrectionContext() {
    const user = await this.requireAuthenticatedUser();
    return { userId: user.id, editable: true };
  }

  async getSupportContext() {
    const user = await this.requireAuthenticatedUser();
    return { userId: user.id, canContactSupport: true };
  }
}
