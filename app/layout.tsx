import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar/Navbar";
import FloatingUploadButton from "./components/FloatingUploadButton";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "TUTN — Material y comunidad universitaria UTN",
  description: "Encontrá resúmenes, parciales y material de estudio de la UTN. Armá tu horario, registrá tu progreso y conectate con otros estudiantes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col body-offset">
        <a href="#main-content" className="skip-link">Ir al contenido principal</a>
        <Navbar />
        <main id="main-content">
          {children}
        </main>
        <FloatingUploadButton />
      </body>
    </html>
  );
}
