import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LLM Benchmark — Model Intelligence Compared",
  description:
    "Compare LLM performance, cost, and speed. Discover great models beyond the big names.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
