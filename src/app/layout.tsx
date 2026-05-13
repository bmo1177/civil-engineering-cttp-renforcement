import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SWRegistrar } from "@/components/cttp/SWRegistrar";
import { LanguageProvider } from "@/lib/translations";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CTTP Renforcement — Pavement Reinforcement Design",
  description: "Production-ready pavement reinforcement design tool following the Algerian CTTP Guide des Renforcements (Dec 1992). Compute traffic classes, deflection corrections, and reinforcement structures with full traceability.",
  keywords: ["CTTP", "pavement", "reinforcement", "Algeria", "civil engineering", "road design", "chaussée", "renforcement"],
  authors: [{ name: "CTTP Direction des Études Techniques" }],
  icons: {
    icon: "/logo.svg",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "CTTP Renforcement — Pavement Reinforcement Design",
    description: "CTTP-compliant pavement reinforcement design tool with AI-powered distress detection",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CTTP Renforcement — Pavement Reinforcement Design",
    description: "CTTP-compliant pavement reinforcement design tool with AI-powered distress detection",
  },
};

export const viewport: Viewport = {
  themeColor: "#1E293B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <LanguageProvider>
          {children}
          <Toaster />
          <SWRegistrar />
        </LanguageProvider>
      </body>
    </html>
  );
}
