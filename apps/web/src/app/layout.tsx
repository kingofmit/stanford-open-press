import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Stanford Open Press",
    template: "%s | Stanford Open Press",
  },
  description:
    "The modern, AI-powered scholarly publishing platform. Beautiful journals, frictionless peer review, and intelligent editorial workflows.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
