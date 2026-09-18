"use client";

import { useState } from "react";
import { joinMatch, leaveMatch } from "@/actions/matches";
import { Match, MatchAttendee, Profile, PlayerCard } from "@/types/database";
import { formatDate } from "@/lib/utils";
import { generateWhatsAppMessage } from "@/lib/team-balancer";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  AlertTriangle,
  CheckCircle2,
  Share2,
  ShieldAlert,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface DashboardViewProps {
  match: Match | null;
  allMatches?: Match[];
  attendees: (MatchAttendee & { card?: PlayerCard; profile?: Profile })[];
  userProfile: Profile | null;
}

export function DashboardView({ match, allMatches = [], attendees, userProfile }: DashboardViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const confirmedList = attendees.filter((a) => a.status === "confirmed");
  const waitingList = attendees.filter((a) => a.status === "waiting");

  // Inscrição do usuário atual
  const myAttendance = userProfile
    ? attendees.find((a) => a.user_id === userProfile.id && a.status !== "dropped")
    : null;

  async function handleJoin() {
    if (!match) return;
    setLoading(true);
    setErrorMsg(null);

    const res = await joinMatch(match.id);
    setLoading(false);

    if (res?.error) {
      setErrorMsg(res.error);
    }
  }

  async function handleLeave() {
    if (!match) return;
    if (!confirm("Tem certeza que deseja cancelar sua inscrição? Se desistir após o horário de corte, será contabilizada falta.")) {
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const res = await leaveMatch(match.id);
    setLoading(false);

    if (res?.error) {
      setErrorMsg(res.error);
    }
  }

  function handleCopyWhatsApp() {
    if (!match) return;

    const confirmedFormatted = confirmedList.map((a) => ({
      name: a.card?.full_name || a.profile?.full_name || "Jogador",
      isPaid: Boolean(a.card?.is_paid ?? a.profile?.is_paid),
      isBrother: Boolean(a.card?.is_brother ?? a.profile?.is_brother),
      overall: a.card?.overall,
      paidMonth: a.card?.paid_month ?? a.profile?.paid_month,
    }));

    const waitingFormatted = waitingList.map((a) => ({
      name: a.card?.full_name || a.profile?.full_name || "Jogador",
      isPaid: Boolean(a.card?.is_paid ?? a.profile?.is_paid),
      isBrother: Boolean(a.card?.is_brother ?? a.profile?.is_brother),
    }));

    // Se houver times divididos
    const teamA = attendees.filter((a) => a.team === "A").map((a) => a.card?.full_name || a.profile?.full_name || "Jogador");
    const teamB = attendees.filter((a) => a.team === "B").map((a) => a.card?.full_name || a.profile?.full_name || "Jogador");

    const text = generateWhatsAppMessage({
      matchDate: match.match_date,
      location: match.location,
      confirmedPlayers: confirmedFormatted,
      waitingPlayers: waitingFormatted,
      teams: teamA.length > 0 && teamB.length > 0 ? { teamA, teamB } : undefined,
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (!match) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-3xl">
          ⚽
        </div>
        <h2 className="text-xl font-bold text-white">Nenhuma partida aberta no momento</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Aguarde a abertura da próxima pelada pelo administrador ou acesse a classificação.
        </p>
      </div>
    );
  }

  const isCutoffPassed = new Date() > new Date(match.cutoff_time);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Alerta de Status de Pagamento do Usuário */}
      {userProfile && (
        <div
          className={`rounded-2xl border p-4 flex items-center justify-between gap-4 backdrop-blur-md ${
            userProfile.is_paid
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-amber-500/40 bg-amber-500/10 text-amber-300"
          }`}
        >
          <div className="flex items-center gap-3">
            {userProfile.is_paid ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
            ) : (
              <ShieldAlert className="h-6 w-6 text-amber-400 shrink-0" />
            )}
            <div>
              <p className="text-sm font-bold">
                {userProfile.is_paid
                  ? `Status de Pagamento: Em dia (${userProfile.paid_month || "Mês Atual"})`
                  : "Status de Pagamento: Pendente"}
              </p>
              <p className="text-xs text-zinc-400">
                {userProfile.is_paid
                  ? `Seu pagamento referente a ${userProfile.paid_month || "este mês"} foi confirmado pelo administrador. Você pode confirmar presença na pelada.`
                  : "Seu voto/inscrição está bloqueado até a confirmação do pagamento pelo administrador."}
              </p>
            </div>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase ${
              userProfile.is_paid ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
            }`}
          >
            {userProfile.is_paid ? (userProfile.paid_month ? `PAGO (${userProfile.paid_month})` : "PAGO") : "PENDENTE"}
          </span>
        </div>
      )}

      {/* Seletor de Partidas (se houver mais de uma cadastrada) */}
      {allMatches.length > 1 && (
        <div className="flex flex-col gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Partidas Agendadas ({allMatches.length}):
            </span>
            <span className="text-[11px] text-zinc-500">Clique para alternar</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {allMatches.map((m) => {
              const isSelected = match?.id === m.id;
              const dateObj = new Date(m.match_date);
              const formattedDate =
                dateObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) +
                " às " +
                dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

              return (
                <button
                  key={m.id}
                  onClick={() => router.push(`/dashboard?matchId=${m.id}`)}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-yellow-500 text-zinc-950 shadow-md shadow-yellow-500/20"
                      : "bg-zinc-800/70 text-zinc-300 border border-zinc-700/60 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  <span>⚽ {m.location}</span>
                  <span className={`text-[10px] ${isSelected ? "text-zinc-900 font-semibold" : "text-zinc-400"}`}>
                    ({formattedDate})
                  </span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
                      m.status === "open"
                        ? isSelected
                          ? "bg-zinc-950 text-yellow-400"
                          : "bg-emerald-500/20 text-emerald-400"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {m.status}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Card Principal da Partida */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 md:p-8 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-full bg-yellow-500/20 px-3 py-0.5 text-xs font-extrabold text-yellow-400 border border-yellow-500/40">
                PROXIMO JOGO
              </span>
              <span className="rounded-full bg-zinc-800 px-3 py-0.5 text-xs font-semibold text-zinc-300">
                Status: {match.status.toUpperCase()}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white capitalize">
              {formatDate(match.match_date)}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-400">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-yellow-500" />
                <span>{match.location}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-red-400" />
                <span>Limite para desistir: {formatDate(match.cutoff_time)}</span>
              </div>
            </div>
          </div>

          {/* Botões de Ação do Usuário */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Botão de Exportação para WhatsApp */}
            <button
              onClick={handleCopyWhatsApp}
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-400 transition-colors hover:bg-emerald-500/20"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado para o WhatsApp!" : "Copiar para WhatsApp"}
            </button>

            {/* Inscrição ou Desistência */}
            {userProfile && (
              <>
                {myAttendance ? (
                  <button
                    onClick={handleLeave}
                    disabled={loading}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Cancelar Minha Vaga ({myAttendance.status === "confirmed" ? "Confirmado" : "Espera"})
                  </button>
                ) : (
                  <button
                    onClick={handleJoin}
                    disabled={loading || !userProfile.is_paid || match.status !== "open"}
                    title={
                      !userProfile.is_paid
                        ? "Você precisa estar com o pagamento confirmado para participar"
                        : "Confirmar vaga na pelada"
                    }
                    className={`flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-wider transition-all shadow-lg ${
                      userProfile.is_paid && match.status === "open"
                        ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-zinc-950 shadow-yellow-500/20 hover:from-yellow-400 hover:to-yellow-500"
                        : "cursor-not-allowed bg-zinc-800 text-zinc-500 border border-zinc-700"
                    }`}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Confirmar Minha Presença"
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-400">
            {errorMsg}
          </div>
        )}

        {/* Indicador de Vagas */}
        <div className="mt-6 flex items-center justify-between text-xs">
          <span className="font-semibold text-zinc-400">
            Vagas Preenchidas: <span className="text-white font-bold">{confirmedList.length}</span> / {match.max_players}
          </span>
          <span className="text-zinc-500 font-medium">
            Lista de Espera: {waitingList.length} jogador(es)
          </span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className={`h-full transition-all duration-500 ${
              confirmedList.length >= match.max_players
                ? "bg-red-500"
                : "bg-gradient-to-r from-yellow-600 to-yellow-400"
            }`}
            style={{ width: `${Math.min(100, (confirmedList.length / match.max_players) * 100)}%` }}
          />
        </div>
      </div>

      {/* Grid: Lista de Confirmados e Fila de Espera */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Coluna 1: Confirmados */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                ✓
              </span>
              Confirmados ({confirmedList.length}/{match.max_players})
            </h2>
          </div>

          <div className="space-y-2.5">
            {confirmedList.length === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center">Nenhum jogador confirmado ainda.</p>
            ) : (
              confirmedList.map((att, idx) => {
                const card = att.card;
                const profile = att.profile;
                const name = card?.full_name || profile?.full_name || "Jogador";
                const username = card?.username || profile?.username || "jogador";
                const overall = card?.overall || 50;
                const isBrother = card?.is_brother ?? profile?.is_brother;

                return (
                  <div
                    key={att.id}
                    className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-800/30 p-3 hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-black text-sm text-yellow-500 w-5">{idx + 1}.</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/profile/${att.user_id}`}
                            className="text-xs font-bold text-white hover:text-yellow-400 hover:underline"
                          >
                            {name}
                          </Link>
                          {isBrother && <span title="Irmão">🤝</span>}
                        </div>
                        <p className="text-[10px] text-zinc-500">@{username}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {att.team && att.team !== "none" && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-black ${
                            att.team === "A" ? "bg-yellow-500/20 text-yellow-400" : "bg-blue-500/20 text-blue-400"
                          }`}
                        >
                          Time {att.team}
                        </span>
                      )}
                      <div className="flex items-center justify-center rounded-lg bg-zinc-900 px-2 py-1 border border-yellow-500/30">
                        <span className="text-xs font-black text-yellow-400">{overall}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Coluna 2: Fila de Espera */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-xs">
                ⏳
              </span>
              Lista de Espera ({waitingList.length})
            </h2>
          </div>

          <div className="space-y-2.5">
            {waitingList.length === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center">Fila de espera vazia.</p>
            ) : (
              waitingList.map((att, idx) => {
                const card = att.card;
                const profile = att.profile;
                const name = card?.full_name || profile?.full_name || "Jogador";
                const username = card?.username || profile?.username || "jogador";
                const isBrother = card?.is_brother ?? profile?.is_brother;

                return (
                  <div
                    key={att.id}
                    className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-800/20 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-xs text-zinc-500 w-5">+{idx + 1}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/profile/${att.user_id}`}
                            className="text-xs font-semibold text-zinc-300 hover:text-yellow-400"
                          >
                            {name}
                          </Link>
                          {isBrother && <span title="Irmão">🤝</span>}
                        </div>
                        <p className="text-[10px] text-zinc-500">@{username}</p>
                      </div>
                    </div>

                    <span className="text-[10px] font-medium text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      Na Fila
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
