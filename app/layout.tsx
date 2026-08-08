import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Andinho do Combo",
  description: "Bebidas, combos e delivery",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
