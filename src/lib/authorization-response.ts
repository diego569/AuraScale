import { AuthorizationError } from "@/policies/authorization-errors";

export function authorizationErrorResponse(error: unknown) {
  if (error instanceof AuthorizationError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.httpStatus },
    );
  }

  throw error;
}
