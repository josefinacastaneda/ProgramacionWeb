import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { SITE_URL } from "@/lib/site";
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

const TITULO = `${NOMBRE_TIENDA} — Drop 01`;
const DESCRIPCION =
  "FINALOOK STUDIO — Drop 01, total black. Curated denim pieces. Tienda editorial de denim hecha en Buenos Aires.";

export const metadata: Metadata = {
  // metadataBase hace que las URLs relativas (canonical, imágenes de Open
  // Graph) se resuelvan contra el dominio propio en vez de quedar rotas.
  metadataBase: new URL(SITE_URL),
  title: TITULO,
  description: DESCRIPCION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: NOMBRE_TIENDA,
    title: TITULO,
    description: DESCRIPCION,
    url: "/",
    locale: "es_AR",
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO,
    description: DESCRIPCION,
  },
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
