import type { Metadata } from "next";
import "./globals.css";
import { Shell } from "@/components/shell";
import { DemoProvider } from "@/components/demo-provider";
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
        <DemoProvider>
          <Shell>{children}</Shell>
        </DemoProvider>
      </body>
    </html>
  );
}
