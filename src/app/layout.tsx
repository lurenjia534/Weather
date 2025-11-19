import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import React from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gemini 3 Weather Card",
  description:
    "Immersive English weather card experience inspired by Gemini 3's concept art.",
  keywords: [
    "Gemini 3",
    "weather card",
    "3D weather",
    "Next.js",
    "interactive UI",
  ],
  openGraph: {
    title: "Gemini 3 Weather Card",
    description:
      "An interactive, English-first weather card concept guided by Gemini 3.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gemini 3 Weather Card",
    description:
      "A cinematic weather card crafted in English from a Gemini 3 concept.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-slate-950 text-slate-50 antialiased`}
      >
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
