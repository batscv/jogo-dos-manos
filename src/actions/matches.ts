"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function joinMatch(matchId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Você precisa estar conectado." };
  }

  // 1. Validação crítica da Regra de Negócio: is_paid
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_paid, full_name")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: "Perfil não localizado." };
  }

  if (!profile.is_paid) {
    return {
      error: "Pagamento pendente: Você precisa estar com o pagamento confirmado pelo administrador para se inscrever no jogo.",
      isNotPaid: true,
    };
  }

  // 2. Verifica se a partida está aberta
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("status, cutoff_time, max_players")
    .eq("id", matchId)
    .single();

  if (matchError || !match || match.status !== "open") {
    return { error: "Esta partida não está aceitando inscrições no momento." };
  }

  // 3. Verifica se já existe inscrição anterior (ex: cancelada/dropped)
  const { data: existingAttendee } = await supabase
    .from("match_attendees")
    .select("id, status")
    .eq("match_id", matchId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingAttendee) {
    if (existingAttendee.status === "confirmed" || existingAttendee.status === "waiting") {
      return { error: "Você já está inscrito nesta partida." };
    }

    // Se estava 'dropped', reativa a inscrição
    // O trigger cuidará ou calculamos as vagas confirmadas
    const { count: confirmedCount } = await supabase
      .from("match_attendees")
      .select("*", { count: "exact", head: true })
      .eq("match_id", matchId)
      .eq("status", "confirmed");

    const newStatus = (confirmedCount || 0) < match.max_players ? "confirmed" : "waiting";

    const { error: updateError } = await supabase
      .from("match_attendees")
      .update({ status: newStatus, created_at: new Date().toISOString() })
      .eq("id", existingAttendee.id);

    if (updateError) {
      return { error: updateError.message };
    }
  } else {
    // Nova inscrição (o trigger on_attendee_inserted no Supabase define confirmed ou waiting)
    const { error: insertError } = await supabase
      .from("match_attendees")
      .insert({
        match_id: matchId,
        user_id: user.id,
      });

    if (insertError) {
      return { error: insertError.message };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}

export async function leaveMatch(matchId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Você precisa estar conectado." };
  }

  // Atualiza para 'dropped'. O trigger do banco cuidará da promoção do primeiro da fila!
  const { error } = await supabase
    .from("match_attendees")
    .update({ status: "dropped" })
    .eq("match_id", matchId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}
