import "server-only";

import { Resend } from "resend";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required.");
  }
  return new Resend(apiKey);
}

export async function sendEmail(input: SendEmailInput) {
  const from = process.env.EMAIL_FROM ?? "AuraScale <onboarding@resend.dev>";
  const { error } = await getResendClient().emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });

  if (error) {
    throw new Error(`Email delivery failed: ${error.message}`);
  }
}
