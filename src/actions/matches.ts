"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function changeAttendance(matchId: string, action: "join_match" | "leave_match") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Você precisa estar conectado." };
  const { data, error } = await supabase.rpc(action, { p_match_id: matchId });
  if (error) return { error: error.message };
  if (!data?.success) return { error: data?.error || "Não foi possível atualizar a inscrição." };
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath(`/profile/${user.id}`);
  return { success: true };
}

export async function joinMatch(matchId: string) {
  return changeAttendance(matchId, "join_match");
}

export async function leaveMatch(matchId: string) {
  return changeAttendance(matchId, "leave_match");
}
