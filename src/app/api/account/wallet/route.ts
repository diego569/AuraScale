import { authorizationErrorResponse } from "@/lib/authorization-response";
import { clientCapabilityService } from "@/services/capabilities/server-services";

export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json(await clientCapabilityService.getWalletBalance());
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}
