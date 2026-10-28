import type { Metadata } from "next";
import "mapbox-gl/dist/mapbox-gl.css";
import "./globals.css";
import { Shell } from "@/components/shell";
import { SessionProvider } from "@/components/session-provider";
export const metadata: Metadata = {
  title: { default: "CommunityHub | Explore", template: "CommunityHub | %s" },
  description:
    "Discover local volunteering opportunities and community events.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <Shell>{children}</Shell>
        </SessionProvider>
      </body>
    </html>
  );
}
