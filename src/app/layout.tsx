import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Model Browser — LLM Intelligence, Speed & Cost Compared",
  description:
    "Compare LLM performance, cost, and speed. Discover great models beyond the big names.",
  openGraph: {
    title: "Model Browser",
    description:
      "Compare LLM performance, cost, and speed. Discover great models beyond the big names.",
    type: "website",
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
      <body className={`antialiased ${inter.className}`}>{children}</body>
    </html>
  );
}
