import { authorizationErrorResponse } from "@/lib/authorization-response";
import { pendingUserService } from "@/services/capabilities/server-services";

export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json(await pendingUserService.getActivationStatus());
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}
