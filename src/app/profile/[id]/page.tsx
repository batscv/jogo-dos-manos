import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ProfileView } from "@/components/ProfileView";
import { PlayerCard } from "@/types/database";

export const runtime = "edge";

export default async function ProfilePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Busca carta do jogador na view view_player_cards
  const { data: cardData, error: cardError } = await supabase
    .from("view_player_cards")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (cardError || !cardData) {
    // Se não encontrar na view, tenta no profiles para caso não tenha avaliações
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    if (!profileData) {
      notFound();
    }
  }

  const card: PlayerCard = cardData || {
    id: params.id,
    username: "jogador",
    full_name: "Jogador",
    avatar_url: null,
    is_brother: false,
    is_admin: false,
    is_paid: false,
    is_monthly: false,
    no_show_count: 0,
    created_at: new Date().toISOString(),
    total_evaluations: 0,
    pace: 50,
    shooting: 50,
    passing: 50,
    dribbling: 50,
    defense: 50,
    physical: 50,
    overall: 50,
  };

  // 2. Busca se o usuário conectado já avaliou este jogador
  let existingRating = null;
  if (user && user.id !== params.id) {
    const { data: ratingData } = await supabase
      .from("player_ratings")
      .select("*")
      .eq("evaluator_id", user.id)
      .eq("evaluated_id", params.id)
      .maybeSingle();

    existingRating = ratingData;
  }

  // 3. Busca estatísticas consolidadas do jogador em partidas
  const { data: statsData } = await supabase
    .from("match_stats")
    .select("goals, assists, is_mvp, is_fair_play")
    .eq("user_id", params.id);

  const stats = (statsData || []).reduce(
    (acc, item) => {
      acc.goals += item.goals || 0;
      acc.assists += item.assists || 0;
      if (item.is_mvp) acc.mvps += 1;
      if (item.is_fair_play) acc.fairPlays += 1;
      return acc;
    },
    { goals: 0, assists: 0, mvps: 0, fairPlays: 0 }
  );

  return (
    <ProfileView
      card={card}
      existingRating={existingRating}
      viewerId={user?.id || null}
      stats={stats}
    />
  );
}
