export const PAYMENT_PROOF_MAX_SIZE_BYTES = 8 * 1024 * 1024;

export const PAYMENT_PROOF_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export function isAllowedProofMimeType(mimeType: string): boolean {
  return (PAYMENT_PROOF_ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}
