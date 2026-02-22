import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://models.dhariri.com"),
  title: "Model Browser — LLM Intelligence, Speed & Cost Compared",
  description:
    "Compare LLM performance, cost, and speed. Discover great models beyond the big names.",
  keywords: ["LLM", "AI models", "benchmark", "GPT", "Claude", "Gemini", "comparison", "cost", "speed", "intelligence"],
  authors: [{ name: "David Hariri", url: "https://dhariri.com" }],
  robots: { index: true, follow: true },
  openGraph: {
    title: "Model Browser",
    description:
      "Compare LLM performance, cost, and speed. Discover great models beyond the big names.",
    type: "website",
    siteName: "Model Browser",
  },
  twitter: {
    card: "summary_large_image",
    title: "Model Browser",
    description:
      "Compare LLM performance, cost, and speed. Discover great models beyond the big names.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://plausible.io/js/pa-RgE3x0mcAs1rg-EMzOw7O.js"
          strategy="afterInteractive"
        />
        <Script id="plausible-init" strategy="afterInteractive">
          {`window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()`}
        </Script>
      </head>
      <body className={`antialiased ${inter.className}`}>{children}</body>
    </html>
  );
}
