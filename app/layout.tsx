import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar/Navbar";
import FloatingUploadButton from "./components/FloatingUploadButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col pt-14">
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
