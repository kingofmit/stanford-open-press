import type { Metadata } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Stanford Open Press",
    template: "%s | Stanford Open Press",
  },
  description:
    "The modern, AI-powered scholarly publishing platform. Beautiful journals, frictionless peer review, and intelligent editorial workflows.",
  openGraph: {
    type: "website",
    siteName: "Stanford Open Press",
    title: "Stanford Open Press",
    description:
      "The modern, AI-powered scholarly publishing platform. Beautiful journals, frictionless peer review, and intelligent editorial workflows.",
  },
  twitter: {
    card: "summary",
    title: "Stanford Open Press",
    description:
      "The modern, AI-powered scholarly publishing platform for journal management.",
  },
  metadataBase: new URL(process.env.NEXTAUTH_URL || "http://localhost:3000"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sourceSans.variable} ${sourceSerif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
