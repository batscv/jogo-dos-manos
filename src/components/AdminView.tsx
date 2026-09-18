"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  togglePaymentStatus,
  updatePaymentMonth,
  createMatch,
  updateMatchStatus,
  deleteMatch,
  assignTeams,
  recordMatchStat,
  addFinancialEntry,
} from "@/actions/admin";
import { Profile, Match, MatchAttendee, PlayerCard, FinancialLedger } from "@/types/database";
import { balanceTeams, TeamDraftResult } from "@/lib/team-balancer";
import { formatCurrency, formatDate, getCurrentMonthText } from "@/lib/utils";
import {
  ShieldCheck,
  CreditCard,
  Calendar,
  Shuffle,
  Trophy,
  DollarSign,
  PlusCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Users,
  AlertTriangle,
  Trash2,
} from "lucide-react";

const MONTH_OPTIONS = [
  "Janeiro/2026", "Fevereiro/2026", "Março/2026", "Abril/2026",
  "Maio/2026", "Junho/2026", "Julho/2026", "Agosto/2026",
  "Setembro/2026", "Outubro/2026", "Novembro/2026", "Dezembro/2026",
  "Janeiro/2027", "Fevereiro/2027", "Março/2027"
];

interface AdminViewProps {
  profiles: Profile[];
  currentMatch: Match | null;
  allMatches?: Match[];
  attendees: (MatchAttendee & { card?: PlayerCard; profile?: Profile })[];
  ledgerEntries: FinancialLedger[];
  totalBalance: number;
}

export function AdminView({
  profiles,
  currentMatch,
  allMatches = [],
  attendees,
  ledgerEntries,
  totalBalance,
}: AdminViewProps) {
  const router = useRouter();
  const matchFormRef = useRef<HTMLFormElement>(null);
  const ledgerFormRef = useRef<HTMLFormElement>(null);

  const [tab, setTab] = useState<"payments" | "match" | "teams" | "stats" | "financial">("payments");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [searchPlayer, setSearchPlayer] = useState("");
  const [draftResult, setDraftResult] = useState<TeamDraftResult | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filtro de jogadores na tabela de pagamentos
  const filteredProfiles = profiles.filter(
    (p) =>
      p.full_name.toLowerCase().includes(searchPlayer.toLowerCase()) ||
      p.username.toLowerCase().includes(searchPlayer.toLowerCase())
  );

  const confirmedPlayers = attendees
    .filter((a) => a.status === "confirmed")
    .map((a) => a.card || (a.profile as any));

  async function handleTogglePayment(userId: string, current: boolean, monthText?: string | null) {
    setLoadingId(userId);
    setActionError(null);
    const res = await togglePaymentStatus(userId, current, monthText);
    setLoadingId(null);
    if (res?.error) {
      setActionError(res.error);
    } else {
      router.refresh();
    }
  }

  async function handleMonthChange(userId: string, newMonth: string) {
    setLoadingId(userId);
    setActionError(null);
    const res = await updatePaymentMonth(userId, newMonth);
    setLoadingId(null);
    if (res?.error) {
      setActionError(res.error);
    } else {
      setActionMessage(`Mês de pagamento atualizado para ${newMonth}!`);
      router.refresh();
      setTimeout(() => setActionMessage(null), 3000);
    }
  }

  function handleRunDraft() {
    if (confirmedPlayers.length < 2) {
      alert("É necessário ter pelo menos 2 jogadores confirmados para realizar o sorteio.");
      return;
    }
    const result = balanceTeams(confirmedPlayers as PlayerCard[]);
    setDraftResult(result);
  }

  async function handleSaveTeams() {
    if (!currentMatch || !draftResult) return;
    setLoadingId("saving-teams");
    setActionError(null);

    const assignments = [
      ...draftResult.teamA.map((p) => ({ userId: p.id, team: "A" as const })),
      ...draftResult.teamB.map((p) => ({ userId: p.id, team: "B" as const })),
    ];

    const res = await assignTeams(currentMatch.id, assignments);
    setLoadingId(null);

    if (res?.error) {
      setActionError(res.error);
    } else {
      setActionMessage("Times balanceados salvos com sucesso!");
      router.refresh();
      setTimeout(() => setActionMessage(null), 3000);
    }
  }

  async function handleCreateMatch(formData: FormData) {
    setActionError(null);
    setActionMessage(null);
    setLoadingId("creating-match");

    const res = await createMatch(formData);
    setLoadingId(null);

    if (res?.error) {
      setActionError(res.error);
    } else {
      setActionMessage("Partida criada com sucesso!");
      matchFormRef.current?.reset();
      router.refresh();
      setTimeout(() => setActionMessage(null), 3000);
    }
  }

  async function handleUpdateMatchStatus(status: "open" | "closed" | "finished") {
    if (!currentMatch) return;
    setLoadingId("status-" + status);
    setActionError(null);

    const res = await updateMatchStatus(currentMatch.id, status);
    setLoadingId(null);

    if (res?.error) {
      setActionError(res.error);
    } else {
      setActionMessage(`Status da partida atualizado para ${status.toUpperCase()}!`);
      router.refresh();
      setTimeout(() => setActionMessage(null), 3000);
    }
  }

  async function handleDeleteMatch(matchId: string) {
    if (!confirm("Tem certeza que deseja excluir esta partida?")) return;
    setLoadingId("delete-" + matchId);
    setActionError(null);

    const res = await deleteMatch(matchId);
    setLoadingId(null);

    if (res?.error) {
      setActionError(res.error);
    } else {
      setActionMessage("Partida excluída com sucesso!");
      router.refresh();
      setTimeout(() => setActionMessage(null), 3000);
    }
  }

  async function handleAddFinancialEntry(formData: FormData) {
    setActionError(null);
    setActionMessage(null);
    setLoadingId("adding-ledger");

    const res = await addFinancialEntry(formData);
    setLoadingId(null);

    if (res?.error) {
      setActionError(res.error);
    } else {
      setActionMessage("Lançamento financeiro registrado com sucesso!");
      ledgerFormRef.current?.reset();
      router.refresh();
      setTimeout(() => setActionMessage(null), 3000);
    }
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-yellow-400" />
            Painel do Administrador
          </h1>
          <p className="text-xs md:text-sm text-zinc-400">
            Controle de pagamentos, gerenciamento de partidas, caixinha e divisão equilibrada de times.
          </p>
        </div>

        {/* Abas */}
        <div className="flex flex-wrap gap-1 rounded-xl bg-zinc-900 p-1 border border-zinc-800">
          <button
            onClick={() => setTab("payments")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              tab === "payments" ? "bg-yellow-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            Pagamentos
          </button>
          <button
            onClick={() => setTab("match")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              tab === "match" ? "bg-yellow-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            Partidas
          </button>
          <button
            onClick={() => setTab("teams")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              tab === "teams" ? "bg-yellow-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Shuffle className="h-3.5 w-3.5" />
            Sorteio Times
          </button>
          <button
            onClick={() => setTab("stats")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              tab === "stats" ? "bg-yellow-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Trophy className="h-3.5 w-3.5" />
            Estatísticas
          </button>
          <button
            onClick={() => setTab("financial")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              tab === "financial" ? "bg-yellow-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            }`}
          >
            <DollarSign className="h-3.5 w-3.5" />
            Caixinha
          </button>
        </div>
      </div>

      {actionError && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs font-bold text-red-400 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {actionMessage && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-400 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* ABA 1: GESTÃO DE PAGAMENTOS */}
      {tab === "payments" && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Controle de Pagamentos (is_paid)</h2>
              <p className="text-xs text-zinc-400">
                Jogadores com status &quot;Pago&quot; estão liberados para votar e confirmar presença nas partidas.
              </p>
            </div>
            <input
              type="text"
              placeholder="Buscar por nome ou @username..."
              value={searchPlayer}
              onChange={(e) => setSearchPlayer(e.target.value)}
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-yellow-500 focus:outline-none"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 uppercase text-zinc-400">
                <tr>
                  <th className="py-3 px-3">Jogador</th>
                  <th className="py-3 px-3">Tipo</th>
                  <th className="py-3 px-3">Faltas</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Mês Pago</th>
                  <th className="py-3 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredProfiles.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-800/30">
                    <td className="py-2.5 px-3">
                      <p className="font-bold text-white">{p.full_name}</p>
                      <p className="text-[10px] text-zinc-500">@{p.username}</p>
                    </td>
                    <td className="py-2.5 px-3">
                      {p.is_brother ? (
                        <span className="rounded bg-yellow-500/10 text-yellow-400 px-1.5 py-0.5 font-semibold">
                          🤝 Irmão
                        </span>
                      ) : (
                        <span className="text-zinc-500">Convidado</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={p.no_show_count > 0 ? "font-bold text-red-400" : "text-zinc-400"}>
                        {p.no_show_count}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          p.is_paid
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {p.is_paid ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {p.is_paid ? "PAGO" : "PENDENTE"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {p.is_paid ? (
                        <select
                          value={p.paid_month || getCurrentMonthText()}
                          onChange={(e) => handleMonthChange(p.id, e.target.value)}
                          disabled={loadingId === p.id}
                          className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] font-semibold text-yellow-400 focus:border-yellow-500 focus:outline-none"
                          title="Alterar mês pago"
                        >
                          {MONTH_OPTIONS.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-zinc-500 text-[11px]">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleTogglePayment(p.id, p.is_paid, p.paid_month || getCurrentMonthText())}
                        disabled={loadingId === p.id}
                        className={`rounded-lg px-3 py-1 font-bold text-[11px] transition-colors disabled:opacity-50 ${
                          p.is_paid
                            ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-red-400"
                            : "bg-yellow-500 text-zinc-950 hover:bg-yellow-400"
                        }`}
                      >
                        {loadingId === p.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : p.is_paid ? (
                          "Marcar Pendente"
                        ) : (
                          "Confirmar Pagamento"
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 2: GESTÃO DE PARTIDAS */}
      {tab === "match" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Criar Partida */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-yellow-400" />
              Criar Nova Partida
            </h2>

            <form ref={matchFormRef} action={handleCreateMatch} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-300">Data e Horário do Jogo</label>
                <input
                  type="datetime-local"
                  name="matchDate"
                  required
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white focus:border-yellow-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300">
                  Horário Limite de Desistência (Cutoff Time)
                </label>
                <input
                  type="datetime-local"
                  name="cutoffTime"
                  required
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white focus:border-yellow-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300">Local da Quadra</label>
                <input
                  type="text"
                  name="location"
                  defaultValue="Quadra Central dos Irmãos"
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white focus:border-yellow-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300">Limite de Jogadores (Padrão 14)</label>
                <input
                  type="number"
                  name="maxPlayers"
                  defaultValue={14}
                  min={2}
                  max={30}
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white focus:border-yellow-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loadingId === "creating-match"}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-yellow-500 py-2.5 text-xs font-bold text-zinc-950 hover:bg-yellow-400 transition-colors disabled:opacity-50"
              >
                {loadingId === "creating-match" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Publicando partida...
                  </>
                ) : (
                  "Publicar Partida"
                )}
              </button>
            </form>
          </div>

          {/* Partida Atual */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">Partida Ativa Atual</h2>
            {currentMatch ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-zinc-800/50 p-4 border border-zinc-800 space-y-2">
                  <p className="text-sm font-black text-white">{formatDate(currentMatch.match_date)}</p>
                  <p className="text-xs text-zinc-400">Local: {currentMatch.location}</p>
                  <p className="text-xs text-zinc-400">Cutoff: {formatDate(currentMatch.cutoff_time)}</p>
                  <p className="text-xs">
                    Status: <span className="font-bold text-yellow-400 uppercase">{currentMatch.status}</span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleUpdateMatchStatus("open")}
                    disabled={Boolean(loadingId?.startsWith("status-"))}
                    className="flex-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50"
                  >
                    Abrir Inscrições
                  </button>
                  <button
                    onClick={() => handleUpdateMatchStatus("closed")}
                    disabled={Boolean(loadingId?.startsWith("status-"))}
                    className="flex-1 rounded-xl bg-amber-500/20 border border-amber-500/40 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/30 disabled:opacity-50"
                  >
                    Fechar Inscrições
                  </button>
                  <button
                    onClick={() => handleUpdateMatchStatus("finished")}
                    disabled={Boolean(loadingId?.startsWith("status-"))}
                    className="flex-1 rounded-xl bg-blue-500/20 border border-blue-500/40 py-2 text-xs font-bold text-blue-400 hover:bg-blue-500/30 disabled:opacity-50"
                  >
                    Finalizar Jogo
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">Nenhuma partida selecionada.</p>
            )}
          </div>

          {/* Lista Completa de Partidas para Gestão e Exclusão */}
          {allMatches.length > 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 md:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-yellow-400" />
                  Todas as Partidas Cadastradas ({allMatches.length})
                </h3>
                <span className="text-xs text-zinc-400">
                  Gerencie o status ou remova partidas duplicadas de teste
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-800 uppercase text-zinc-400">
                    <tr>
                      <th className="py-2.5 px-3">Local</th>
                      <th className="py-2.5 px-3">Data e Hora</th>
                      <th className="py-2.5 px-3">Cutoff</th>
                      <th className="py-2.5 px-3">Limite</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {allMatches.map((m) => {
                      const isSelected = currentMatch?.id === m.id;
                      return (
                        <tr key={m.id} className={isSelected ? "bg-yellow-500/10" : "hover:bg-zinc-800/30"}>
                          <td className="py-2.5 px-3 font-bold text-white">
                            {m.location} {isSelected && <span className="text-[10px] text-yellow-400 font-semibold">(Em foco)</span>}
                          </td>
                          <td className="py-2.5 px-3 text-zinc-300">{formatDate(m.match_date)}</td>
                          <td className="py-2.5 px-3 text-zinc-400">{formatDate(m.cutoff_time)}</td>
                          <td className="py-2.5 px-3 text-zinc-300">{m.max_players} vagas</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                                m.status === "open"
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : m.status === "closed"
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                              }`}
                            >
                              {m.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!isSelected && (
                                <button
                                  onClick={() => router.push(`/admin?matchId=${m.id}`)}
                                  className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 text-[11px] font-semibold text-zinc-200"
                                >
                                  Selecionar
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteMatch(m.id)}
                                disabled={loadingId === "delete-" + m.id}
                                className="rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-2 py-1 text-[11px] font-semibold text-red-400 transition-colors disabled:opacity-50"
                                title="Excluir partida"
                              >
                                {loadingId === "delete-" + m.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA 3: SORTEIO BALANCEADO DE TIMES */}
      {tab === "teams" && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Shuffle className="h-5 w-5 text-yellow-400" />
                Sorteio Balanceado por Overall
              </h2>
              <p className="text-xs text-zinc-400">
                O algoritmo analisa o overall das cartas FIFA dos 14 confirmados e divide em Time A e Time B
                garantindo equilíbrio técnico na partida.
              </p>
            </div>

            <button
              onClick={handleRunDraft}
              className="flex items-center gap-2 rounded-xl bg-yellow-500 px-4 py-2.5 text-xs font-extrabold text-zinc-950 hover:bg-yellow-400"
            >
              <Shuffle className="h-4 w-4" />
              Sortear Times Agora
            </button>
          </div>

          {draftResult ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Time A */}
                <div className="rounded-2xl border border-yellow-500/40 bg-zinc-900/80 p-5">
                  <div className="flex items-center justify-between border-b border-yellow-500/30 pb-3 mb-3">
                    <span className="font-black text-sm text-yellow-400 uppercase tracking-wider">
                      🟡 TIME A (AMARELO)
                    </span>
                    <span className="text-xs font-bold text-zinc-300">
                      Média OVR: <span className="text-yellow-400 font-black">{draftResult.avgA}</span>
                    </span>
                  </div>
                  <div className="space-y-2">
                    {draftResult.teamA.map((p, idx) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-lg bg-zinc-800/50 p-2 text-xs"
                      >
                        <span className="font-bold text-white">
                          {idx + 1}. {p.full_name}
                        </span>
                        <span className="font-black text-yellow-400">{p.overall}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Time B */}
                <div className="rounded-2xl border border-blue-500/40 bg-zinc-900/80 p-5">
                  <div className="flex items-center justify-between border-b border-blue-500/30 pb-3 mb-3">
                    <span className="font-black text-sm text-blue-400 uppercase tracking-wider">
                      🔵 TIME B (AZUL)
                    </span>
                    <span className="text-xs font-bold text-zinc-300">
                      Média OVR: <span className="text-blue-400 font-black">{draftResult.avgB}</span>
                    </span>
                  </div>
                  <div className="space-y-2">
                    {draftResult.teamB.map((p, idx) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-lg bg-zinc-800/50 p-2 text-xs"
                      >
                        <span className="font-bold text-white">
                          {idx + 1}. {p.full_name}
                        </span>
                        <span className="font-black text-blue-400">{p.overall}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-zinc-950 p-4 border border-zinc-800">
                <span className="text-xs text-zinc-400">
                  Diferença de soma de Overalls: <span className="font-bold text-white">{draftResult.diff} pontos</span>
                </span>
                <button
                  onClick={handleSaveTeams}
                  disabled={loadingId === "saving-teams"}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-400"
                >
                  {loadingId === "saving-teams" ? "Salvando..." : "Salvar Times no Banco"}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-xs text-zinc-500">
              Clique em &quot;Sortear Times Agora&quot; para gerar a divisão equilibrada dos confirmados.
            </div>
          )}
        </div>
      )}

      {/* ABA 4: ESTATÍSTICAS PÓS-JOGO */}
      {tab === "stats" && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Lançar Estatísticas da Partida</h2>
          <p className="text-xs text-zinc-400">
            Informe gols, assistências, MVP e prêmio Fair Play para os jogadores confirmados na partida.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 uppercase text-zinc-400">
                <tr>
                  <th className="py-3 px-3">Jogador</th>
                  <th className="py-3 px-3 text-center">Gols</th>
                  <th className="py-3 px-3 text-center">Assistências</th>
                  <th className="py-3 px-3 text-center">MVP 👑</th>
                  <th className="py-3 px-3 text-center">Fair Play 🤝</th>
                  <th className="py-3 px-3 text-right">Salvar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {confirmedPlayers.map((player) => (
                  <StatRow key={player.id} player={player} matchId={currentMatch?.id} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 5: LIVRO CAIXA / CAIXINHA */}
      {tab === "financial" && (
        <div className="space-y-6">
          {/* Card de Saldo */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase">Saldo da Caixinha</p>
              <p className={`text-3xl font-black ${totalBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {formatCurrency(totalBalance)}
              </p>
            </div>
            <p className="text-xs text-zinc-500 max-w-sm text-center sm:text-right">
              Valores positivos representam arrecadações (mensalidades e jogos avulsos). Valores negativos representam
              aluguel de quadra, bolas e coletes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Formulário Novo Lançamento */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4 md:col-span-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-yellow-400" />
                Novo Lançamento
              </h3>
              <form ref={ledgerFormRef} action={handleAddFinancialEntry} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300">Descrição</label>
                  <input
                    type="text"
                    name="description"
                    required
                    placeholder="Ex: Aluguel da Quadra / Mensalidade"
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white focus:border-yellow-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300">
                    Valor (ECV) <span className="text-[10px] text-zinc-400">Use sinal de - para despesas</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="amount"
                    required
                    placeholder="Ex: 500 ou -2800"
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white focus:border-yellow-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300">Categoria</label>
                  <select
                    name="category"
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white focus:border-yellow-500 focus:outline-none"
                  >
                    <option value="mensalidade">Mensalidade</option>
                    <option value="avulso">Avulso</option>
                    <option value="aluguel">Aluguel Quadra</option>
                    <option value="material">Material (Bolas/Coletes)</option>
                    <option value="geral">Outros</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loadingId === "adding-ledger"}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-yellow-500 py-2.5 text-xs font-bold text-zinc-950 hover:bg-yellow-400 disabled:opacity-50"
                >
                  {loadingId === "adding-ledger" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    "Registrar no Livro Caixa"
                  )}
                </button>
              </form>
            </div>

            {/* Extrato Financeiro */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 md:col-span-2 space-y-4">
              <h3 className="text-base font-bold text-white">Extrato de Movimentações</h3>
              <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-800 uppercase text-zinc-400">
                    <tr>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Descrição</th>
                      <th className="py-2.5 px-3">Categoria</th>
                      <th className="py-2.5 px-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {ledgerEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-zinc-800/30">
                        <td className="py-2.5 px-3 text-zinc-400">{entry.entry_date}</td>
                        <td className="py-2.5 px-3 font-semibold text-white">{entry.description}</td>
                        <td className="py-2.5 px-3 text-zinc-400 capitalize">{entry.category}</td>
                        <td
                          className={`py-2.5 px-3 text-right font-black ${
                            entry.amount >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {formatCurrency(entry.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponente de linha de estatística para cada jogador
function StatRow({ player, matchId }: { player: any; matchId?: string }) {
  const [goals, setGoals] = useState(0);
  const [assists, setAssists] = useState(0);
  const [isMvp, setIsMvp] = useState(false);
  const [isFairPlay, setIsFairPlay] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!matchId) return;
    setSaving(true);
    await recordMatchStat({
      matchId,
      userId: player.id,
      goals,
      assists,
      isMvp,
      isFairPlay,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <tr className="hover:bg-zinc-800/30">
      <td className="py-2.5 px-3">
        <p className="font-bold text-white">{player.full_name}</p>
        <p className="text-[10px] text-zinc-500">@{player.username}</p>
      </td>
      <td className="py-2.5 px-3 text-center">
        <input
          type="number"
          min={0}
          value={goals}
          onChange={(e) => setGoals(parseInt(e.target.value) || 0)}
          className="w-14 rounded-lg border border-zinc-700 bg-zinc-800 py-1 text-center font-bold text-white"
        />
      </td>
      <td className="py-2.5 px-3 text-center">
        <input
          type="number"
          min={0}
          value={assists}
          onChange={(e) => setAssists(parseInt(e.target.value) || 0)}
          className="w-14 rounded-lg border border-zinc-700 bg-zinc-800 py-1 text-center font-bold text-white"
        />
      </td>
      <td className="py-2.5 px-3 text-center">
        <input
          type="checkbox"
          checked={isMvp}
          onChange={(e) => setIsMvp(e.target.checked)}
          className="h-4 w-4 accent-yellow-500"
        />
      </td>
      <td className="py-2.5 px-3 text-center">
        <input
          type="checkbox"
          checked={isFairPlay}
          onChange={(e) => setIsFairPlay(e.target.checked)}
          className="h-4 w-4 accent-emerald-500"
        />
      </td>
      <td className="py-2.5 px-3 text-right">
        <button
          onClick={handleSave}
          disabled={saving || !matchId}
          className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-1 text-[11px] font-bold text-yellow-400"
        >
          {saving ? "..." : saved ? "✓ Salvo" : "Salvar"}
        </button>
      </td>
    </tr>
  );
}
