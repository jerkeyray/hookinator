import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { Analytics } from "@vercel/analytics/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hookinator",
  description: "webhook testing app",
  openGraph: {
    title: "Hookinator",
    description: "Webhook Testing Toolkit.",
    url: "https://hookinator.jerkeyray.com",
    siteName: "Hookinator",
    images: [
      {
        url: "/hookinator.png", 
        width: 1200,
        height: 630,
        alt: "A promotional image for the Hookinator application.",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hookinator",
    description: "Webhook Testing Toolkit.",
    // The image URL should be absolute for Twitter cards
    images: ["https://hookinator.jerkeyray.com/hookinator.png"], 
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>{children}</SessionProvider>
        <Analytics />
      </body>
    </html>
  );
}
