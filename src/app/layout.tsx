import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Futsal dos Irmãos | Gestão de Pelada Semanal",
  description: "Sistema de gerenciamento para pelada de futsal semanal com cartões estilo FIFA, controle de vagas e caixinha.",
};


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.className} min-h-screen bg-zinc-950 text-zinc-100 antialiased`}>
        <div className="flex min-h-screen flex-col">
          {children}
          <footer className="border-t border-zinc-900 bg-zinc-950 py-6 text-center text-xs text-zinc-500">
            <p>© {new Date().getFullYear()} Futsal dos Irmãos — Respeito, Amizade e Pelada de Alto Nível.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
