import type { Metadata } from "next";
import type { ReactElement, ReactNode } from "react";

export const metadata: Metadata = {
  metadataBase: new URL(process.env["NEXT_PUBLIC_SITE_URL"] ?? "https://disnote.dev"),
  title: {
    default: "DisNote Documents",
    template: "%s | DisNote",
  },
  description: "Published DisNote documents rendered from immutable revisions.",
};

export default function RootLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
