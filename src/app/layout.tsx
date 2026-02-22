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
  title: "Compare LLM Models — Benchmarks, Pricing & Speed | Model Browser",
  description:
    "Compare GPT, Claude, Gemini, Llama and more. Filter AI models by intelligence benchmarks, API pricing, and tokens per second. Updated weekly.",
  keywords: ["LLM comparison", "AI model benchmarks", "LLM pricing", "GPT vs Claude", "model speed", "tokens per second", "GPQA", "SWE-Bench", "MMLU", "AI API cost"],
  authors: [{ name: "David Hariri", url: "https://dhariri.com" }],
  robots: { index: true, follow: true },
  alternates: { canonical: "https://models.dhariri.com" },
  openGraph: {
    title: "Compare LLM Models — Benchmarks, Pricing & Speed",
    description:
      "Compare GPT, Claude, Gemini, Llama and more. Filter AI models by intelligence benchmarks, API pricing, and tokens per second.",
    type: "website",
    siteName: "Model Browser",
    images: [{ url: "https://models.dhariri.com/og.png", width: 2358, height: 1524 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Compare LLM Models — Benchmarks, Pricing & Speed",
    description:
      "Compare GPT, Claude, Gemini, Llama and more. Filter AI models by intelligence benchmarks, API pricing, and tokens per second.",
    images: ["https://models.dhariri.com/og.png"],
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
