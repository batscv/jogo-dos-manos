"use client";

import { PlayerCard as PlayerCardType } from "@/types/database";
import { Star, ShieldCheck, Sparkles, UserCheck } from "lucide-react";
import Image from "next/image";

interface PlayerCardProps {
  card: PlayerCardType;
  onRateClick?: () => void;
  canRate?: boolean;
}

function getStatColor(value: number): string {
  if (value >= 80) return "text-emerald-400";
  if (value >= 65) return "text-yellow-400";
  return "text-orange-400";
}

export function PlayerCard({ card, onRateClick, canRate = false }: PlayerCardProps) {
  return (
    <div className="relative mx-auto w-full max-w-[300px] select-none transition-transform duration-300 hover:scale-[1.02]">
      {/* Carta estilo FIFA Ultimate Team Dourada */}
      <div className="fifa-card-gold rounded-3xl p-5 text-zinc-100 shadow-2xl">
        {/* Topo da Carta: Overall, Posição e Badge Irmão */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col items-center">
            <span className="text-4xl font-black tracking-tighter text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {card.overall}
            </span>
            <span className="text-xs font-extrabold uppercase tracking-widest text-yellow-200/90">
              FUT
            </span>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {card.is_brother && (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-0.5 text-[10px] font-bold text-yellow-300 border border-yellow-500/40">
                <span>🤝</span> Irmão
              </span>
            )}
            {card.is_admin && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-500/40">
                <ShieldCheck className="h-3 w-3" /> Admin
              </span>
            )}
          </div>
        </div>

        {/* Foto do Jogador / Avatar Central */}
        <div className="relative mx-auto my-3 flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-2 border-yellow-500/60 bg-gradient-to-b from-yellow-900/30 to-zinc-900 shadow-inner">
          {card.avatar_url ? (
            <img
              src={card.avatar_url}
              alt={card.full_name}
              className="h-full w-full object-cover object-top"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-yellow-400/80">
              <span className="text-3xl font-black">
                {card.full_name.substring(0, 2).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Nome do Jogador */}
        <div className="text-center">
          <h3 className="truncate text-lg font-black uppercase tracking-wide text-yellow-100 drop-shadow-sm">
            {card.full_name}
          </h3>
          <p className="text-xs font-semibold text-yellow-300/80">@{card.username}</p>
        </div>

        {/* Linha Divisória de Luxo */}
        <div className="my-3 h-[1.5px] w-full bg-gradient-to-r from-transparent via-yellow-500/70 to-transparent" />

        {/* Grid dos 6 Atributos (FIFA Stats) */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-3 text-sm">
          <div className="flex items-center justify-between font-bold">
            <span className="text-xs uppercase tracking-wider text-yellow-200/70">PAC</span>
            <span className={getStatColor(card.pace)}>{card.pace}</span>
          </div>
          <div className="flex items-center justify-between font-bold">
            <span className="text-xs uppercase tracking-wider text-yellow-200/70">DRI</span>
            <span className={getStatColor(card.dribbling)}>{card.dribbling}</span>
          </div>

          <div className="flex items-center justify-between font-bold">
            <span className="text-xs uppercase tracking-wider text-yellow-200/70">SHO</span>
            <span className={getStatColor(card.shooting)}>{card.shooting}</span>
          </div>
          <div className="flex items-center justify-between font-bold">
            <span className="text-xs uppercase tracking-wider text-yellow-200/70">DEF</span>
            <span className={getStatColor(card.defense)}>{card.defense}</span>
          </div>

          <div className="flex items-center justify-between font-bold">
            <span className="text-xs uppercase tracking-wider text-yellow-200/70">PAS</span>
            <span className={getStatColor(card.passing)}>{card.passing}</span>
          </div>
          <div className="flex items-center justify-between font-bold">
            <span className="text-xs uppercase tracking-wider text-yellow-200/70">PHY</span>
            <span className={getStatColor(card.physical)}>{card.physical}</span>
          </div>
        </div>

        {/* Rodapé da Carta: Contagem de avaliações */}
        <div className="mt-4 flex items-center justify-between border-t border-yellow-500/20 pt-2 text-[11px] text-yellow-300/70">
          <span>{card.total_evaluations} avaliações</span>
          {canRate && onRateClick && (
            <button
              onClick={onRateClick}
              className="inline-flex items-center gap-1 rounded-md bg-yellow-500/20 px-2 py-0.5 text-xs font-bold text-yellow-300 transition-colors hover:bg-yellow-500/40 hover:text-white"
            >
              <Sparkles className="h-3 w-3" />
              Avaliar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
