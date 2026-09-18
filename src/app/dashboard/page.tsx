import { createClient } from "@/lib/supabase/server";
import { DashboardView } from "@/components/DashboardView";
import { Match, MatchAttendee, PlayerCard, Profile } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { matchId?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userProfile: Profile | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    userProfile = data;
  }

  // 1. Busca todas as partidas abertas ou cadastradas
  const { data: rawMatches } = await supabase
    .from("matches")
    .select("*")
    .order("created_at", { ascending: false });

  const allMatches: Match[] = rawMatches || [];

  // 2. Determina a partida atual exibida:
  // - Se houver matchId nos parâmetros, usa ela.
  // - Senão, seleciona a partida com status 'open' mais recente.
  // - Se não houver 'open', seleciona a mais recente criada.
  let currentMatch: Match | null = null;

  if (searchParams?.matchId) {
    currentMatch = allMatches.find((m) => m.id === searchParams.matchId) || null;
  }

  if (!currentMatch && allMatches.length > 0) {
    currentMatch = allMatches.find((m) => m.status === "open") || allMatches[0];
  }

  // 3. Se houver partida, busca os participantes
  let attendees: (MatchAttendee & { card?: PlayerCard; profile?: Profile })[] = [];

  if (currentMatch) {
    const { data: rawAttendees } = await supabase
      .from("match_attendees")
      .select(`
        id,
        match_id,
        user_id,
        status,
        team,
        created_at,
        profile:profiles (*),
        card:view_player_cards (*)
      `)
      .eq("match_id", currentMatch.id)
      .neq("status", "dropped")
      .order("created_at", { ascending: true });

    attendees = (rawAttendees as any[]) || [];
  }

  return (
    <DashboardView
      match={currentMatch}
      allMatches={allMatches}
      attendees={attendees}
      userProfile={userProfile}
    />
  );
}
