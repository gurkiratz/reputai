import type { Metadata } from "next";
import "./globals.css";
import { AppTheme } from "@/components/AppTheme";

export const metadata: Metadata = {
  title: "Review Ops Platform",
  description: "AI review operations platform for multi-location dental groups.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppTheme>{children}</AppTheme>
      </body>
    </html>
  );
}
