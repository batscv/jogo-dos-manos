"use client";

import { useState } from "react";
import Link from "next/link";
import { register } from "@/actions/auth";
import { Loader2, UserPlus, User, AtSign, Mail, Lock, Image as ImageIcon, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isBrother, setIsBrother] = useState(false);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("isBrother", String(isBrother));

    const result = await register(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-xl backdrop-blur-md">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-yellow-500 to-yellow-600 text-2xl shadow-lg shadow-yellow-500/20">
            🤝
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Criar Nova Conta</h1>
          <p className="mt-1 text-xs text-zinc-400">Junte-se à comunidade do Futsal dos Irmãos</p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-xs font-medium text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar com Pré-visualização */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-yellow-500/50 bg-zinc-800">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center text-zinc-500">
                  <ImageIcon className="h-6 w-6" />
                  <span className="text-[10px]">Foto</span>
                </div>
              )}
            </div>
            <label className="cursor-pointer text-xs font-semibold text-yellow-400 hover:underline">
              <span>Escolher foto de perfil</span>
              <input
                type="file"
                name="avatar"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-300">Nome Completo</label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                name="fullName"
                required
                placeholder="Ex: João Silva"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800/80 py-2 pl-9 pr-4 text-sm text-white placeholder-zinc-500 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-300">Username (@único)</label>
            <div className="relative">
              <AtSign className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                name="username"
                required
                placeholder="joaosilva"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800/80 py-2 pl-9 pr-4 text-sm text-white placeholder-zinc-500 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-300">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
              <input
                type="email"
                name="email"
                required
                placeholder="joao@exemplo.com"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800/80 py-2 pl-9 pr-4 text-sm text-white placeholder-zinc-500 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-300">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
              <input
                type="password"
                name="password"
                required
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800/80 py-2 pl-9 pr-4 text-sm text-white placeholder-zinc-500 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
              />
            </div>
          </div>

          {/* Toggle "Sou um irmão" */}
          <div
            onClick={() => setIsBrother(!isBrother)}
            className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-colors ${
              isBrother
                ? "border-yellow-500/60 bg-yellow-500/10"
                : "border-zinc-800 bg-zinc-800/40 hover:bg-zinc-800/60"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🤝</span>
              <div>
                <p className="text-xs font-bold text-white">Sou um Irmão</p>
                <p className="text-[11px] text-zinc-400">Membro da comunidade / congregação dos irmãos</p>
              </div>
            </div>
            <div
              className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${
                isBrother ? "border-yellow-500 bg-yellow-500 text-zinc-950" : "border-zinc-600"
              }`}
            >
              {isBrother && <CheckCircle2 className="h-4 w-4 stroke-[3]" />}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 py-3 font-bold text-zinc-950 shadow-md shadow-yellow-500/20 transition-all hover:from-yellow-400 hover:to-yellow-500 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Criando conta...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Concluir Cadastro
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-400">
          Já possui conta?{" "}
          <Link href="/login" className="font-semibold text-yellow-400 hover:underline">
            Faça login aqui
          </Link>
        </p>
      </div>
    </div>
  );
}
