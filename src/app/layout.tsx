import type { Metadata } from "next";

import "@/app/globals.css";
import { StorefrontFooter } from "@/components/storefront/storefront-footer";
import { StorefrontHeader } from "@/components/storefront/storefront-header";
import { requireAuthenticatedUser } from "@/policies/server-authorization";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.AUTH_URL ?? "http://localhost:3000"),
  title: {
    default: "AuraScale — Wholesale digital access",
    template: "%s · AuraScale",
  },
  description:
    "Wholesale access tiers and digital service licenses for modern operators, with clear USD pricing and guided provisioning.",
  openGraph: {
    title: "AuraScale — Wholesale digital access",
    description:
      "Premium digital service licenses, transparent wholesale tiers, and human-verified provisioning.",
    type: "website",
    images: [{ url: "/og.png", width: 1733, height: 908, alt: "AuraScale digital access platform" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AuraScale — Wholesale digital access",
    description:
      "Premium digital service licenses with transparent wholesale tiers.",
    images: ["/og.png"],
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // DB-verified, not just a decoded JWT claim (see login/register pages for
  // why: a valid cookie can outlive the user it names).
  const user = await requireAuthenticatedUser().catch(() => null);
  const isModerator = user?.role === "MODERATOR" || user?.role === "ADMIN";

  return (
    <html lang="en">
      <body>
        <StorefrontHeader authenticated={Boolean(user)} isModerator={isModerator} />
        <main>{children}</main>
        <StorefrontFooter />
      </body>
    </html>
  );
}
