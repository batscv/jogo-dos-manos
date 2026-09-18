import { PlayerCard } from "@/types/database";

export interface TeamDraftResult {
  teamA: PlayerCard[];
  teamB: PlayerCard[];
  avgA: number;
  avgB: number;
  totalA: number;
  totalB: number;
  diff: number;
}

/**
 * Algoritmo de Sorteio Balanceado (Equilíbrio de Overall)
 * Divide uma lista de jogadores confirmados em dois times (Time A e Time B)
 * minimizando a diferença na soma do overall.
 */
export function balanceTeams(players: PlayerCard[]): TeamDraftResult {
  if (players.length === 0) {
    return {
      teamA: [],
      teamB: [],
      avgA: 0,
      avgB: 0,
      totalA: 0,
      totalB: 0,
      diff: 0,
    };
  }

  // Ordena os jogadores por overall decrescente
  const sorted = [...players].sort((a, b) => b.overall - a.overall);

  const teamA: PlayerCard[] = [];
  const teamB: PlayerCard[] = [];
  let sumA = 0;
  let sumB = 0;

  const targetTeamSize = Math.ceil(sorted.length / 2);

  // Abordagem gulosa (Greedy partition) com restrição de tamanho máximo de time
  for (const player of sorted) {
    if (teamA.length >= targetTeamSize) {
      teamB.push(player);
      sumB += player.overall;
    } else if (teamB.length >= targetTeamSize) {
      teamA.push(player);
      sumA += player.overall;
    } else {
      if (sumA <= sumB) {
        teamA.push(player);
        sumA += player.overall;
      } else {
        teamB.push(player);
        sumB += player.overall;
      }
    }
  }

  const avgA = teamA.length > 0 ? Math.round((sumA / teamA.length) * 10) / 10 : 0;
  const avgB = teamB.length > 0 ? Math.round((sumB / teamB.length) * 10) / 10 : 0;

  return {
    teamA,
    teamB,
    avgA,
    avgB,
    totalA: sumA,
    totalB: sumB,
    diff: Math.abs(sumA - sumB),
  };
}

/**
 * Gerador de texto para cópia de lista formatada para o WhatsApp
 */
export function generateWhatsAppMessage(params: {
  matchDate: string;
  location: string;
  confirmedPlayers: { name: string; isPaid: boolean; isBrother: boolean; overall?: number; paidMonth?: string | null }[];
  waitingPlayers: { name: string; isPaid: boolean; isBrother: boolean }[];
  teams?: { teamA: string[]; teamB: string[] };
}): string {
  const dateFormatted = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(params.matchDate));

  let msg = `⚽ *FUTSAL DOS IRMÃOS* ⚽\n`;
  msg += `📅 *Data:* ${dateFormatted}\n`;
  msg += `📍 *Local:* ${params.location}\n\n`;

  msg += `📋 *CONFIRMADOS (${params.confirmedPlayers.length}/14):*\n`;
  params.confirmedPlayers.forEach((p, idx) => {
    const paidTag = p.isPaid ? (p.paidMonth ? `✅ Pago (${p.paidMonth})` : "✅ Pago") : "⚠️ Pendente";
    const brotherTag = p.isBrother ? " 🤝" : "";
    const ovrTag = p.overall ? ` [${p.overall}]` : "";
    msg += `${idx + 1}. ${p.name}${ovrTag}${brotherTag} (${paidTag})\n`;
  });

  if (params.waitingPlayers.length > 0) {
    msg += `\n⏳ *LISTA DE ESPERA (${params.waitingPlayers.length}):*\n`;
    params.waitingPlayers.forEach((p, idx) => {
      msg += `${idx + 1}. ${p.name}\n`;
    });
  }

  if (params.teams && params.teams.teamA.length > 0 && params.teams.teamB.length > 0) {
    msg += `\n⚔️ *TIMES SORTEADOS:*\n`;
    msg += `🟡 *TIME A:*\n`;
    params.teams.teamA.forEach((name) => {
      msg += `• ${name}\n`;
    });
    msg += `\n🔵 *TIME B:*\n`;
    params.teams.teamB.forEach((name) => {
      msg += `• ${name}\n`;
    });
  }

  msg += `\n⚠️ _Lembrete: Desistências após o horário limite contam como falta (no-show)._\n`;
  msg += `📲 Acesse para acompanhar: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}`;

  return msg;
}
