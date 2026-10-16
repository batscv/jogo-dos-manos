"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentMonthText } from "@/lib/utils";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Não autenticado: Faça login primeiro.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_admin) {
    throw new Error("Acesso não autorizado: Você precisa ser administrador.");
  }

  return { supabase, user };
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

    const { data: result, error } = await supabase.rpc("admin_toggle_payment", {
      p_user_id: userId,
      p_is_paid: newStatus,
      p_paid_month: paidMonth,
    });

    if (error) throw error;
    if (!result?.success) throw new Error(result?.error || "Erro ao atualizar pagamento.");

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath(`/profile/${userId}`);
    revalidatePath("/");
    return { success: true, isPaid: newStatus, paidMonth };
  } catch (error: any) {
    console.error("togglePaymentStatus error:", error);
    return { error: error.message };
  }
}

// 1.1 Atualizar mês de referência de pagamento específico
export async function updatePaymentMonth(userId: string, monthText: string) {
  try {
    const { supabase } = await verifyAdmin();

    const { data: result, error } = await supabase.rpc("admin_toggle_payment", {
      p_user_id: userId,
      p_is_paid: true,
      p_paid_month: monthText,
    });

    if (error) throw error;
    if (!result?.success) throw new Error(result?.error || "Erro ao atualizar mês.");

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath(`/profile/${userId}`);
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("updatePaymentMonth error:", error);
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

    if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 100) return { error: "O número de jogadores deve estar entre 2 e 100." };
    const matchDateObj = new Date(matchDate);
    const cutoffTimeObj = new Date(cutoffTime);

    if (isNaN(matchDateObj.getTime()) || isNaN(cutoffTimeObj.getTime())) {
      return { error: "Formato de data ou horário inválido." };
    }

    if (cutoffTimeObj >= matchDateObj) return { error: "O horário limite deve ser anterior ao jogo." };

    const { data: result, error } = await supabase.rpc("admin_create_match", {
      p_match_date: matchDateObj.toISOString(),
      p_cutoff_time: cutoffTimeObj.toISOString(),
      p_location: location,
      p_max_players: maxPlayers,
    });

    if (error) {
      console.error("Erro ao criar partida:", error);
      return { error: `Erro no banco de dados: ${error.message}` };
    }
    if (!result?.success) return { error: result?.error || "Erro desconhecido ao criar partida." };

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/");
    return { success: true, match: result.match };
  } catch (error: any) {
    console.error("Exceção ao criar partida:", error);
    return { error: error.message || "Erro desconhecido ao criar partida." };
  }
}

// 3. Atualizar status da partida
export async function updateMatchStatus(matchId: string, status: "open" | "closed" | "finished") {
  try {
    const { supabase } = await verifyAdmin();

    const { data: result, error } = await supabase.rpc("admin_update_match_status", {
      p_match_id: matchId,
      p_status: status,
    });

    if (error) throw error;
    if (!result?.success) throw new Error(result?.error || "Não foi possível atualizar o status da partida.");

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true, updatedMatch: result.match };
  } catch (error: any) {
    console.error("updateMatchStatus error:", error);
    return { error: error.message };
  }
}

// 4. Excluir partida com cascata
export async function deleteMatch(matchId: string) {
  try {
    const { supabase } = await verifyAdmin();

    const { data: result, error } = await supabase.rpc("admin_delete_match", {
      p_match_id: matchId,
    });

    if (error) throw error;
    if (!result?.success) throw new Error(result?.error || "Não foi possível excluir a partida.");

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/");
    return { success: true, deletedMatchId: matchId };
  } catch (error: any) {
    console.error("deleteMatch error:", error);
    return { error: error.message };
  }
}

// 4. Salvar times sorteados nos inscritos
export async function assignTeams(matchId: string, teamAssignments: { userId: string; team: "A" | "B" | "none" }[]) {
  try {
    const { supabase } = await verifyAdmin();

    for (const item of teamAssignments) {
      const { data: result, error } = await supabase.rpc("admin_assign_team", {
        p_match_id: matchId,
        p_user_id: item.userId,
        p_team: item.team,
      });
      if (error) throw error;
      if (!result?.success) throw new Error(result?.error || "Erro ao atribuir time.");
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

    const { data: result, error } = await supabase.rpc("admin_record_match_stat", {
      p_match_id: input.matchId,
      p_user_id: input.userId,
      p_goals: input.goals,
      p_assists: input.assists,
      p_is_mvp: input.isMvp,
      p_is_fair_play: input.isFairPlay,
    });

    if (error) throw error;
    if (!result?.success) throw new Error(result?.error || "Erro ao registrar estatística.");

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
    const { supabase } = await verifyAdmin();

    const description = formData.get("description") as string;
    const amount = parseFloat(formData.get("amount") as string);
    const category = formData.get("category") as string || "geral";
    const entryDate = formData.get("entryDate") as string || new Date().toISOString().split("T")[0];

    if (!description?.trim() || !Number.isFinite(amount) || amount === 0) {
      return { error: "Descrição e valor válido são obrigatórios." };
    }

    const { data: result, error } = await supabase.rpc("admin_add_financial_entry", {
      p_description: description,
      p_amount: amount,
      p_category: category,
      p_entry_date: entryDate,
    });

    if (error) throw error;
    if (!result?.success) throw new Error(result?.error || "Erro ao lançar movimentação.");

    revalidatePath("/admin");
    return { success: true, newEntry: result.entry };
  } catch (error: any) {
    console.error("addFinancialEntry error:", error);
    return { error: error.message };
  }
}
