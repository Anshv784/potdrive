import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { THEME_BOOT } from "@/lib/theme-boot";

// One typeface on every platform, so the product looks the same on Windows, Linux, Android and macOS.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  metadataBase: new URL("https://potdrive.anshverma.tech"),
  title: { default: "PotDrive: native file storage on Portaldot", template: "%s · PotDrive" },
  description:
    "Store files directly in Portaldot's TransactionStorage. One signature, real IPFS CIDs, and every byte verifiable in your browser.",
  openGraph: {
    title: "PotDrive",
    description: "Portaldot already had storage built in. PotDrive makes it one click.",
    url: "https://potdrive.anshverma.tech",
    siteName: "PotDrive",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
