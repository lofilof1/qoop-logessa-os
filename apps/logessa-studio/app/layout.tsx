import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LOGESSA Studio — Fikirden koleksiyona",
  description: "Duvar kâğıdı ve desenler için araştırma, tasarım, baskı kontrolü ve Etsy ilan çalışma alanı.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
