import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument" });

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
  themeColor: "#0f0e13",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${mono.variable} ${instrument.variable}`}>
      <body>{children}</body>
    </html>
  );
}
