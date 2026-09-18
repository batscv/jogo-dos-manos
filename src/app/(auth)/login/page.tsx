"use client";

import { useState } from "react";
import Link from "next/link";
import { login } from "@/actions/auth";
import { Loader2, LogIn, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await login(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-xl backdrop-blur-md">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-yellow-500 to-yellow-600 text-2xl shadow-lg shadow-yellow-500/20">
            ⚽
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Bem-vindo de Volta!</h1>
          <p className="mt-1 text-sm text-zinc-400">Entre com seu e-mail e senha para acessar o Futsal dos Irmãos</p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-sm font-medium text-red-400">
            {error}
          </div>
        )}

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-300">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-zinc-500" />
              <input
                type="email"
                name="email"
                required
                placeholder="seu@email.com"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-300">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-zinc-500" />
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 py-3 font-bold text-zinc-950 shadow-md shadow-yellow-500/20 transition-all hover:from-yellow-400 hover:to-yellow-500 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                <LogIn className="h-5 w-5" />
                Entrar
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-400">
          Ainda não tem conta?{" "}
          <Link href="/register" className="font-semibold text-yellow-400 hover:underline">
            Cadastre-se aqui
          </Link>
        </p>
      </div>
    </div>
  );
}
