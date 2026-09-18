"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentMonthText } from "@/lib/utils";

async function verifyAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Não autenticado: Faça login primeiro.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_admin) {
    throw new Error("Acesso não autorizado: Você precisa ser administrador.");
  }

  let db = supabase;
  try {
    db = createAdminClient();
  } catch (e) {
    db = supabase;
  }

  return { supabase: db, user };
}

// 1. Alternar status de pagamento (is_paid) com mês de referência
export async function togglePaymentStatus(
  userId: string,
  currentStatus: boolean,
  monthText?: string | null
) {
  try {
    const { supabase } = await verifyAdmin();

    const newStatus = !currentStatus;
    const paidMonth = newStatus ? (monthText || getCurrentMonthText()) : null;

    const { error } = await supabase
      .from("profiles")
      .update({
        is_paid: newStatus,
        paid_month: paidMonth,
      })
      .eq("id", userId);

    if (error) throw error;

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath(`/profile/${userId}`);
    revalidatePath("/");
    return { success: true, isPaid: newStatus, paidMonth };
  } catch (error: any) {
    return { error: error.message };
  }
}

// 1.1 Atualizar mês de referência de pagamento específico
export async function updatePaymentMonth(userId: string, monthText: string) {
  try {
    const { supabase } = await verifyAdmin();

    const { error } = await supabase
      .from("profiles")
      .update({
        is_paid: true,
        paid_month: monthText,
      })
      .eq("id", userId);

    if (error) throw error;

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath(`/profile/${userId}`);
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

// 2. Criar nova partida
export async function createMatch(formData: FormData) {
  try {
    const { supabase } = await verifyAdmin();

    const matchDate = formData.get("matchDate") as string;
    const cutoffTime = formData.get("cutoffTime") as string;
    const location = (formData.get("location") as string) || "Quadra Principal";
    const maxPlayers = parseInt(formData.get("maxPlayers") as string) || 14;

    if (!matchDate || !cutoffTime) {
      return { error: "Informe a data do jogo e o horário limite de corte." };
    }

    const matchDateObj = new Date(matchDate);
    const cutoffTimeObj = new Date(cutoffTime);

    if (isNaN(matchDateObj.getTime()) || isNaN(cutoffTimeObj.getTime())) {
      return { error: "Formato de data ou horário inválido." };
    }

    const { data: newMatch, error } = await supabase
      .from("matches")
      .insert({
        match_date: matchDateObj.toISOString(),
        cutoff_time: cutoffTimeObj.toISOString(),
        location,
        max_players: maxPlayers,
        status: "open",
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao inserir partida no Supabase:", error);
      return { error: `Erro no banco de dados: ${error.message}` };
    }

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/");
    return { success: true, match: newMatch };
  } catch (error: any) {
    console.error("Exceção ao criar partida:", error);
    return { error: error.message || "Erro desconhecido ao criar partida." };
  }
}

// 3. Atualizar status da partida
export async function updateMatchStatus(matchId: string, status: "open" | "closed" | "finished") {
  try {
    const { supabase } = await verifyAdmin();

    const { error } = await supabase
      .from("matches")
      .update({ status })
      .eq("id", matchId);

    if (error) throw error;

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

// 4. Excluir partida
export async function deleteMatch(matchId: string) {
  try {
    const { supabase } = await verifyAdmin();

    const { error } = await supabase
      .from("matches")
      .delete()
      .eq("id", matchId);

    if (error) throw error;

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

// 4. Salvar times sorteados nos inscritos
export async function assignTeams(matchId: string, teamAssignments: { userId: string; team: "A" | "B" | "none" }[]) {
  try {
    const { supabase } = await verifyAdmin();

    for (const item of teamAssignments) {
      await supabase
        .from("match_attendees")
        .update({ team: item.team })
        .eq("match_id", matchId)
        .eq("user_id", item.userId);
    }

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

// 5. Registrar estatísticas do jogo
export async function recordMatchStat(input: {
  matchId: string;
  userId: string;
  goals: number;
  assists: number;
  isMvp: boolean;
  isFairPlay: boolean;
}) {
  try {
    const { supabase } = await verifyAdmin();

    const { error } = await supabase
      .from("match_stats")
      .upsert(
        {
          match_id: input.matchId,
          user_id: input.userId,
          goals: input.goals,
          assists: input.assists,
          is_mvp: input.isMvp,
          is_fair_play: input.isFairPlay,
        },
        { onConflict: "match_id, user_id" }
      );

    if (error) throw error;

    revalidatePath("/admin");
    revalidatePath("/leaderboard");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

// 6. Livro Caixa: Lançar movimentação financeira
export async function addFinancialEntry(formData: FormData) {
  try {
    const { supabase, user } = await verifyAdmin();

    const description = formData.get("description") as string;
    const amount = parseFloat(formData.get("amount") as string);
    const category = formData.get("category") as string || "geral";
    const entryDate = formData.get("entryDate") as string || new Date().toISOString().split("T")[0];

    if (!description || isNaN(amount)) {
      return { error: "Descrição e valor válido são obrigatórios." };
    }

    const { error } = await supabase
      .from("financial_ledger")
      .insert({
        description,
        amount,
        category,
        entry_date: entryDate,
        created_by: user.id,
      });

    if (error) throw error;

    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
