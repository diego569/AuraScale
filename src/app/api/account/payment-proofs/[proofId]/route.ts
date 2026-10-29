import { authorizationErrorResponse } from "@/lib/authorization-response";
import { getPrisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { requireAuthenticatedUser } from "@/policies/server-authorization";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ proofId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { proofId } = await params;

    const proof = await getPrisma().paymentProof.findUnique({
      where: { id: proofId },
      select: {
        objectKey: true,
        originalFileName: true,
        mimeType: true,
        paymentSubmission: { select: { submittedByUserId: true } },
      },
    });

    if (!proof) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Proof not found." } },
        { status: 404 },
      );
    }

    const isOwner = proof.paymentSubmission.submittedByUserId === user.id;
    const isReviewer = user.role === "MODERATOR" || user.role === "ADMIN";
    if (!isOwner && !isReviewer) {
      return Response.json(
        { error: { code: "FORBIDDEN", message: "Not authorized to view this proof." } },
        { status: 403 },
      );
    }

    const data = await storage.getObject(proof.objectKey);
    if (!data) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "File not found in storage." } },
        { status: 404 },
      );
    }

    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": proof.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(proof.originalFileName)}"`,
        "Cache-Control": "private, max-age=0, no-store",
      },
    });
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}
