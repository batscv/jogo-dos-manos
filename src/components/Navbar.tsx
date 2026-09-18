"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/actions/auth";
import { Profile } from "@/types/database";
import { Trophy, Users, ShieldCheck, LogOut, User as UserIcon, Calendar } from "lucide-react";

interface NavbarProps {
  profile?: Profile | null;
}

export function Navbar({ profile }: NavbarProps) {
  const pathname = usePathname();

  const navLinks = [
    { href: "/dashboard", label: "Pelada", icon: Calendar },
    { href: "/leaderboard", label: "Classificação", icon: Trophy },
  ];

  if (profile?.is_admin) {
    navLinks.push({ href: "/admin", label: "Painel Admin", icon: ShieldCheck });
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 font-bold tracking-tight text-white hover:opacity-90">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 text-zinc-950 shadow-md shadow-yellow-500/20">
            ⚽
          </div>
          <div className="flex flex-col">
            <span className="text-base font-extrabold leading-tight text-yellow-400">FUTSAL</span>
            <span className="text-xs tracking-wider text-zinc-400">DOS IRMÃOS</span>
          </div>
        </Link>

        {/* Links de navegação */}
        {profile && (
          <nav className="flex items-center gap-1 sm:gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30"
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Informações do Jogador / Ações */}
        <div className="flex items-center gap-3">
          {profile ? (
            <div className="flex items-center gap-3">
              {/* Status de Pagamento */}
              <div
                className={`hidden md:flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  profile.is_paid
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                }`}
                title={profile.is_paid ? "Pagamento em dia" : "Pagamento pendente"}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${profile.is_paid ? "bg-emerald-400" : "bg-amber-400"}`} />
                {profile.is_paid ? "Pago" : "Pendente"}
              </div>

              {/* Link Perfil com Avatar */}
              <Link
                href={`/profile/${profile.id}`}
                className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-zinc-800"
                title="Meu Perfil"
              >
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    className="h-8 w-8 rounded-full border border-yellow-500/50 object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-300">
                    {profile.full_name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="hidden text-sm font-medium text-zinc-200 lg:inline">
                  {profile.full_name.split(" ")[0]}
                </span>
              </Link>

              {/* Botão Sair */}
              <form action={logout}>
                <button
                  type="submit"
                  className="rounded-md p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-red-400"
                  title="Sair"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-yellow-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-yellow-400"
              >
                Cadastrar
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
