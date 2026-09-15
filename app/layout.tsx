import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ToastProvider } from "@/components/toast";
import { Nav } from "@/components/nav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk" });

export const metadata: Metadata = {
  title: { default: "Frecciata", template: "%s · Frecciata" },
  description:
    "Prenotazione dei turni di allenamento per la società di tiro con l'arco.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${inter.variable} ${grotesk.variable}`}>
      <body className="bg-paper font-sans text-ink antialiased">
        <Providers>
          <ToastProvider>
            <Nav />
            <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-16">{children}</main>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
