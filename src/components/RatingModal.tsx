"use client";

import { useState } from "react";
import { submitRating } from "@/actions/ratings";
import { PlayerCard as PlayerCardType, PlayerRating } from "@/types/database";
import { X, Sparkles, Loader2 } from "lucide-react";

interface RatingModalProps {
  card: PlayerCardType;
  existingRating?: PlayerRating | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RatingModal({ card, existingRating, isOpen, onClose }: RatingModalProps) {
  const [pace, setPace] = useState(existingRating?.pace || card.pace || 70);
  const [shooting, setShooting] = useState(existingRating?.shooting || card.shooting || 70);
  const [passing, setPassing] = useState(existingRating?.passing || card.passing || 70);
  const [dribbling, setDribbling] = useState(existingRating?.dribbling || card.dribbling || 70);
  const [defense, setDefense] = useState(existingRating?.defense || card.defense || 70);
  const [physical, setPhysical] = useState(existingRating?.physical || card.physical || 70);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const calculatedOverall = Math.round(
    (pace + shooting + passing + dribbling + defense + physical) / 6
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await submitRating({
      evaluatedId: card.id,
      pace,
      shooting,
      passing,
      dribbling,
      defense,
      physical,
    });

    setLoading(false);

    if (res?.error) {
      setError(res.error);
    } else {
      onClose();
    }
  }

  const attributes = [
    { label: "Ritmo / Velocidade (PAC)", value: pace, setter: setPace },
    { label: "Finalização / Chute (SHO)", value: shooting, setter: setShooting },
    { label: "Passe / Visão de Jogo (PAS)", value: passing, setter: setPassing },
    { label: "Drible / Agilidade (DRI)", value: dribbling, setter: setDribbling },
    { label: "Defesa / Marcação (DEF)", value: defense, setter: setDefense },
    { label: "Físico / Resistência (PHY)", value: physical, setter: setPhysical },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-yellow-500/40 bg-zinc-900 p-6 shadow-2xl">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Cabeçalho */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/20 text-yellow-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Avaliar Jogador</h2>
            <p className="text-xs text-zinc-400">
              Dê suas notas estilo FIFA para <span className="font-semibold text-yellow-400">{card.full_name}</span>
            </p>
          </div>
        </div>

        {/* Prévia do Overall com as novas notas */}
        <div className="my-4 flex items-center justify-between rounded-xl border border-yellow-500/30 bg-zinc-950/60 p-3">
          <span className="text-sm font-medium text-zinc-300">Overall Calculado:</span>
          <span className="text-2xl font-black text-yellow-400">{calculatedOverall}</span>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-2.5 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Formulário com Sliders */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="max-h-[320px] space-y-3 overflow-y-auto pr-2">
            {attributes.map((attr) => (
              <div key={attr.label} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-zinc-300">{attr.label}</span>
                  <span className="text-yellow-400 font-bold">{attr.value}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="99"
                  value={attr.value}
                  onChange={(e) => attr.setter(parseInt(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-yellow-500"
                />
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 py-2.5 font-bold text-zinc-950 shadow-md transition-all hover:from-yellow-400 hover:to-yellow-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando notas...
                </>
              ) : (
                "Salvar Avaliação"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
