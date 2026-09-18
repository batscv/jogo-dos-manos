import { createClient } from "@/lib/supabase/server";
import { Trophy, Goal, Award, HeartHandshake, Star } from "lucide-react";
import Link from "next/link";

export const revalidate = 60; // Revalida a cada 60s
export const runtime = "edge";

export default async function LeaderboardPage() {
  const supabase = createClient();

  // 1. Busca estatísticas agregadas
  const { data: statsRaw } = await supabase
    .from("match_stats")
    .select(`
      user_id,
      goals,
      assists,
      is_mvp,
      is_fair_play,
      profile:profiles (
        id,
        username,
        full_name,
        avatar_url,
        is_brother
      )
    `);

  // 2. Busca melhores cartas na view
  const { data: topCards } = await supabase
    .from("view_player_cards")
    .select("id, username, full_name, avatar_url, is_brother, overall, pace, shooting, dribbling")
    .order("overall", { ascending: false })
    .limit(10);

  // Consolidação de estatísticas por usuário
  const userStatsMap: Record<
    string,
    {
      id: string;
      fullName: string;
      username: string;
      avatarUrl: string | null;
      isBrother: boolean;
      goals: number;
      assists: number;
      mvps: number;
      fairPlays: number;
    }
  > = {};

  (statsRaw || []).forEach((row: any) => {
    const p = row.profile;
    if (!p) return;
    if (!userStatsMap[p.id]) {
      userStatsMap[p.id] = {
        id: p.id,
        fullName: p.full_name,
        username: p.username,
        avatarUrl: p.avatar_url,
        isBrother: p.is_brother,
        goals: 0,
        assists: 0,
        mvps: 0,
        fairPlays: 0,
      };
    }
    userStatsMap[p.id].goals += row.goals || 0;
    userStatsMap[p.id].assists += row.assists || 0;
    if (row.is_mvp) userStatsMap[p.id].mvps += 1;
    if (row.is_fair_play) userStatsMap[p.id].fairPlays += 1;
  });

  const playersList = Object.values(userStatsMap);

  const topScorers = [...playersList].sort((a, b) => b.goals - a.goals).slice(0, 5);
  const topAssists = [...playersList].sort((a, b) => b.assists - a.assists).slice(0, 5);
  const topMvps = [...playersList].sort((a, b) => b.mvps - a.mvps).slice(0, 5);
  const topFairPlays = [...playersList].sort((a, b) => b.fairPlays - a.fairPlays).slice(0, 5);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white flex items-center gap-2">
          <Trophy className="h-8 w-8 text-yellow-400" />
          Classificação & Rankings
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Acompanhe os artilheiros, garçons, craques da rodada e os maiores overalls do Futsal dos Irmãos.
        </p>
      </div>

      {/* Grid de Tabelas de Líderes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Artilharia */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <div className="flex items-center gap-2 mb-4 text-yellow-400">
            <Goal className="h-5 w-5" />
            <h2 className="font-bold text-base text-white">Artilheiros</h2>
          </div>
          <div className="space-y-3">
            {topScorers.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">Nenhum gol registrado ainda</p>
            ) : (
              topScorers.map((player, idx) => (
                <Link
                  key={player.id}
                  href={`/profile/${player.id}`}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-800/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-sm text-yellow-500 w-4">{idx + 1}º</span>
                    <div>
                      <p className="text-xs font-bold text-zinc-200">{player.fullName}</p>
                      <p className="text-[10px] text-zinc-500">@{player.username}</p>
                    </div>
                  </div>
                  <span className="font-black text-sm text-yellow-400">{player.goals} ⚽</span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Assistências */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <div className="flex items-center gap-2 mb-4 text-blue-400">
            <Award className="h-5 w-5" />
            <h2 className="font-bold text-base text-white">Garçons</h2>
          </div>
          <div className="space-y-3">
            {topAssists.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">Nenhuma assistência registrada</p>
            ) : (
              topAssists.map((player, idx) => (
                <Link
                  key={player.id}
                  href={`/profile/${player.id}`}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-800/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-sm text-blue-400 w-4">{idx + 1}º</span>
                    <div>
                      <p className="text-xs font-bold text-zinc-200">{player.fullName}</p>
                      <p className="text-[10px] text-zinc-500">@{player.username}</p>
                    </div>
                  </div>
                  <span className="font-black text-sm text-blue-400">{player.assists} 👟</span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* MVPs */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <div className="flex items-center gap-2 mb-4 text-amber-400">
            <Trophy className="h-5 w-5" />
            <h2 className="font-bold text-base text-white">Melhor em Campo</h2>
          </div>
          <div className="space-y-3">
            {topMvps.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">Nenhum MVP eleito ainda</p>
            ) : (
              topMvps.map((player, idx) => (
                <Link
                  key={player.id}
                  href={`/profile/${player.id}`}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-800/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-sm text-amber-400 w-4">{idx + 1}º</span>
                    <div>
                      <p className="text-xs font-bold text-zinc-200">{player.fullName}</p>
                      <p className="text-[10px] text-zinc-500">@{player.username}</p>
                    </div>
                  </div>
                  <span className="font-black text-sm text-amber-400">{player.mvps} 👑</span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Fair Play */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <div className="flex items-center gap-2 mb-4 text-emerald-400">
            <HeartHandshake className="h-5 w-5" />
            <h2 className="font-bold text-base text-white">Irmão da Paz</h2>
          </div>
          <div className="space-y-3">
            {topFairPlays.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">Nenhum registro ainda</p>
            ) : (
              topFairPlays.map((player, idx) => (
                <Link
                  key={player.id}
                  href={`/profile/${player.id}`}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-800/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-sm text-emerald-400 w-4">{idx + 1}º</span>
                    <div>
                      <p className="text-xs font-bold text-zinc-200">{player.fullName}</p>
                      <p className="text-[10px] text-zinc-500">@{player.username}</p>
                    </div>
                  </div>
                  <span className="font-black text-sm text-emerald-400">{player.fairPlays} 🤝</span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Top 10 Cartas FIFA (Maiores Overalls) */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
          <Star className="h-5 w-5 text-yellow-400" />
          Top Overalls das Cartas FIFA
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800 text-xs uppercase text-zinc-400">
              <tr>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Jogador</th>
                <th className="py-3 px-4 text-center">OVR</th>
                <th className="py-3 px-4 text-center hidden sm:table-cell">PAC</th>
                <th className="py-3 px-4 text-center hidden sm:table-cell">SHO</th>
                <th className="py-3 px-4 text-center hidden sm:table-cell">DRI</th>
                <th className="py-3 px-4 text-right">Perfil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {(topCards || []).map((card, idx) => (
                <tr key={card.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3 px-4 font-black text-yellow-500">{idx + 1}º</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{card.full_name}</span>
                      {card.is_brother && (
                        <span className="text-xs" title="Irmão">🤝</span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500">@{card.username}</span>
                  </td>
                  <td className="py-3 px-4 text-center font-black text-lg text-yellow-400">
                    {card.overall}
                  </td>
                  <td className="py-3 px-4 text-center font-semibold text-zinc-300 hidden sm:table-cell">
                    {card.pace}
                  </td>
                  <td className="py-3 px-4 text-center font-semibold text-zinc-300 hidden sm:table-cell">
                    {card.shooting}
                  </td>
                  <td className="py-3 px-4 text-center font-semibold text-zinc-300 hidden sm:table-cell">
                    {card.dribbling}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/profile/${card.id}`}
                      className="text-xs font-semibold text-yellow-400 hover:underline"
                    >
                      Ver Carta →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
