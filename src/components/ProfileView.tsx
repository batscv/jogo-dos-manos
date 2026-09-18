"use client";

import { useState } from "react";
import { PlayerCard as PlayerCardType, PlayerRating } from "@/types/database";
import { PlayerCard } from "./PlayerCard";
import { RatingModal } from "./RatingModal";
import { Trophy, Goal, Award, HeartHandshake, Sparkles, Camera, Loader2, CheckCircle2 } from "lucide-react";
import { updateAvatar } from "@/actions/profile";
import { useRouter } from "next/navigation";

interface ProfileViewProps {
  card: PlayerCardType;
  existingRating: PlayerRating | null;
  viewerId: string | null;
  stats: {
    goals: number;
    assists: number;
    mvps: number;
    fairPlays: number;
  };
}

export function ProfileView({ card, existingRating, viewerId, stats }: ProfileViewProps) {
  const router = useRouter();
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [currentCard, setCurrentCard] = useState(card);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState(false);

  const canRate = Boolean(viewerId && viewerId !== card.id);
  const isOwner = Boolean(viewerId && viewerId === card.id);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setAvatarError(null);
    setAvatarSuccess(false);

    const formData = new FormData();
    formData.append("avatar", file);

    const res = await updateAvatar(formData);
    setUploadingAvatar(false);

    if (res?.error) {
      setAvatarError(res.error);
    } else if (res?.avatarUrl) {
      setCurrentCard((prev) => ({ ...prev, avatar_url: res.avatarUrl }));
      setAvatarSuccess(true);
      router.refresh();
      setTimeout(() => setAvatarSuccess(false), 3000);
    }
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        {/* Coluna da Carta FIFA */}
        <div className="flex flex-col items-center justify-start md:col-span-5">
          <PlayerCard
            card={currentCard}
            canRate={canRate}
            onRateClick={() => setIsRatingOpen(true)}
          />

          {/* Opção para o dono da conta alterar sua foto de perfil */}
          {isOwner && (
            <div className="mt-4 w-full max-w-[300px] space-y-2">
              <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-yellow-500/50 bg-yellow-500/10 px-4 py-2.5 text-xs font-bold text-yellow-400 transition-colors hover:bg-yellow-500/20">
                {uploadingAvatar ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Enviando foto...</span>
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4" />
                    <span>Alterar Foto da Carta</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={uploadingAvatar}
                  className="hidden"
                />
              </label>

              {avatarSuccess && (
                <p className="flex items-center justify-center gap-1 text-center text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Foto atualizada com sucesso!
                </p>
              )}

              {avatarError && (
                <p className="text-center text-xs font-semibold text-red-400">
                  {avatarError}
                </p>
              )}
            </div>
          )}

          {canRate && (
            <button
              onClick={() => setIsRatingOpen(true)}
              className="mt-6 flex w-full max-w-[300px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 py-2.5 font-bold text-zinc-950 shadow-lg shadow-yellow-500/20 transition-all hover:from-yellow-400 hover:to-yellow-500"
            >
              <Sparkles className="h-4 w-4" />
              {existingRating ? "Editar Minha Avaliação" : "Avaliar Jogador (1-99)"}
            </button>
          )}

          {existingRating && (
            <p className="mt-2 text-center text-xs text-zinc-400">
              Você já avaliou este jogador. Clique acima para alterar suas notas.
            </p>
          )}
        </div>

        {/* Coluna de Estatísticas e Histórico */}
        <div className="space-y-6 md:col-span-7">
          {/* Cabeçalho do Perfil */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="text-2xl font-black text-white">{card.full_name}</h1>
                <p className="text-sm font-semibold text-yellow-500">@{card.username}</p>
              </div>

              <div className="flex items-center gap-2">
                {card.is_brother && (
                  <span className="rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-bold text-yellow-300 border border-yellow-500/40">
                    🤝 Irmão
                  </span>
                )}
                {card.is_monthly && (
                  <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold text-blue-300 border border-blue-500/40">
                    Mensalista
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-400">
              <div>
                <span className="text-zinc-500">No-shows (Faltas):</span>{" "}
                <span className="font-semibold text-red-400">{card.no_show_count}</span>
              </div>
              <div>
                <span className="text-zinc-500">Pagamento:</span>{" "}
                <span className={card.is_paid ? "font-semibold text-emerald-400" : "font-semibold text-amber-400"}>
                  {card.is_paid ? (card.paid_month ? `Confirmado (${card.paid_month})` : "Confirmado") : "Pendente"}
                </span>
              </div>
            </div>
          </div>

          {/* Cards de Estatísticas da Carreira */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 text-center">
              <Goal className="mx-auto h-6 w-6 text-yellow-400" />
              <p className="mt-2 text-2xl font-black text-white">{stats.goals}</p>
              <p className="text-[11px] font-semibold uppercase text-zinc-400">Gols</p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 text-center">
              <Award className="mx-auto h-6 w-6 text-blue-400" />
              <p className="mt-2 text-2xl font-black text-white">{stats.assists}</p>
              <p className="text-[11px] font-semibold uppercase text-zinc-400">Assistências</p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 text-center">
              <Trophy className="mx-auto h-6 w-6 text-amber-400" />
              <p className="mt-2 text-2xl font-black text-white">{stats.mvps}</p>
              <p className="text-[11px] font-semibold uppercase text-zinc-400">MVPs</p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 text-center">
              <HeartHandshake className="mx-auto h-6 w-6 text-emerald-400" />
              <p className="mt-2 text-2xl font-black text-white">{stats.fairPlays}</p>
              <p className="text-[11px] font-semibold uppercase text-zinc-400">Fair Play</p>
            </div>
          </div>

          {/* Guia de Atributos */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-300">
              Desempenho Técnico (Média dos Votos)
            </h2>

            <div className="space-y-3">
              {[
                { label: "Ritmo / Velocidade (PAC)", val: card.pace },
                { label: "Finalização / Chute (SHO)", val: card.shooting },
                { label: "Passe / Visão de Jogo (PAS)", val: card.passing },
                { label: "Drible / Habilidade (DRI)", val: card.dribbling },
                { label: "Defesa / Marcação (DEF)", val: card.defense },
                { label: "Físico / Raça (PHY)", val: card.physical },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-zinc-400">{item.label}</span>
                    <span className="font-bold text-yellow-400">{item.val}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-500"
                      style={{ width: `${item.val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Avaliação */}
      <RatingModal
        card={card}
        existingRating={existingRating}
        isOpen={isRatingOpen}
        onClose={() => setIsRatingOpen(false)}
      />
    </div>
  );
}
