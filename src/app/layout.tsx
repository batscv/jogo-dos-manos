import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Futsal dos Irmãos | Gestão de Pelada Semanal",
  description: "Sistema de gerenciamento para pelada de futsal semanal com cartões estilo FIFA, controle de vagas e caixinha.",
};

export const runtime = "edge";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    profile = data;
  }

  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.className} min-h-screen bg-zinc-950 text-zinc-100 antialiased`}>
        <div className="flex min-h-screen flex-col">
          <Navbar profile={profile} />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-zinc-900 bg-zinc-950 py-6 text-center text-xs text-zinc-500">
            <p>© {new Date().getFullYear()} Futsal dos Irmãos — Respeito, Amizade e Pelada de Alto Nível.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
