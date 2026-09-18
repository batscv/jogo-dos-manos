import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminView } from "@/components/AdminView";
import { Profile, Match, MatchAttendee, PlayerCard, FinancialLedger } from "@/types/database";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: { matchId?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Verifica se é administrador
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  const isUserAdmin = userProfile?.is_admin === true || user.email === "britoediey@gmail.com";

  if (!isUserAdmin) {
    redirect("/dashboard");
  }

  // Auto-promove se for britoediey@gmail.com e ainda não estava marcado no banco
  if (!userProfile?.is_admin && user.email === "britoediey@gmail.com") {
    await supabase.from("profiles").update({ is_admin: true }).eq("id", user.id);
  }

  // 2. Busca lista de todos os perfis cadastrados
  const { data: rawProfiles } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });

  const profiles: Profile[] = rawProfiles || [];

  // 3. Busca TODAS as partidas cadastradas
  const { data: rawMatches } = await supabase
    .from("matches")
    .select("*")
    .order("created_at", { ascending: false });

  const allMatches: Match[] = rawMatches || [];

  // Seleciona a partida em foco:
  let currentMatch: Match | null = null;
  if (searchParams?.matchId) {
    currentMatch = allMatches.find((m) => m.id === searchParams.matchId) || null;
  }
  if (!currentMatch && allMatches.length > 0) {
    currentMatch = allMatches.find((m) => m.status === "open") || allMatches[0];
  }

  // 4. Se houver partida, busca inscritos
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

  // 5. Busca extrato da caixinha (Livro Caixa)
  const { data: rawLedger } = await supabase
    .from("financial_ledger")
    .select("*")
    .order("entry_date", { ascending: false })
    .limit(50);

  const ledgerEntries: FinancialLedger[] = rawLedger || [];
  const totalBalance = ledgerEntries.reduce((acc, item) => acc + Number(item.amount || 0), 0);

  return (
    <AdminView
      profiles={profiles}
      currentMatch={currentMatch}
      allMatches={allMatches}
      attendees={attendees}
      ledgerEntries={ledgerEntries}
      totalBalance={totalBalance}
    />
  );
}
