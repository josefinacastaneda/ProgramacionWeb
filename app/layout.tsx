import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

const NOMBRE_TIENDA = process.env.NEXT_PUBLIC_NOMBRE_TIENDA || "FINALOOK STUDIO";

export const metadata: Metadata = {
  title: `${NOMBRE_TIENDA} — Drop 01`,
  description:
    "FINALOOK STUDIO — Drop 01. Curated denim pieces. Tienda editorial de denim hecha en Buenos Aires.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${cormorant.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
