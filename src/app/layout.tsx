import type { Metadata } from "next";
import { Inter, Roboto, Orbitron } from "next/font/google";
import "./globals.css"; // Keep global styles here

const inter = Inter({ subsets: ["latin"] });
const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ["latin"],
  variable: '--font-roboto'
});
const orbitron = Orbitron({
  weight: ['400', '700', '900'],
  subsets: ["latin"],
  variable: '--font-orbitron'
});

export const metadata: Metadata = {
  title: "Anna Lógica",
  description: "Plataforma de análisis y transcripción de medios.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} ${roboto.variable} ${orbitron.variable}`}>
        {children}
      </body>
    </html>
  );
}