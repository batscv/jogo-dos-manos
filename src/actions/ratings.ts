"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface RatingInput {
  evaluatedId: string;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defense: number;
  physical: number;
}

export async function submitRating(input: RatingInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Você precisa estar conectado para avaliar." };
  }

  if (user.id === input.evaluatedId) {
    return { error: "Você não pode avaliar a si mesmo!" };
  }

  // Validação dos limites (1 a 99)
  const attributes = [
    input.pace,
    input.shooting,
    input.passing,
    input.dribbling,
    input.defense,
    input.physical,
  ];

  for (const attr of attributes) {
    if (typeof attr !== "number" || attr < 1 || attr > 99) {
      return { error: "Todos os atributos devem estar entre 1 e 99." };
    }
  }

  // Upsert com base na constraint unique_evaluator_evaluated
  const { error } = await supabase
    .from("player_ratings")
    .upsert(
      {
        evaluator_id: user.id,
        evaluated_id: input.evaluatedId,
        pace: Math.round(input.pace),
        shooting: Math.round(input.shooting),
        passing: Math.round(input.passing),
        dribbling: Math.round(input.dribbling),
        defense: Math.round(input.defense),
        physical: Math.round(input.physical),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "evaluator_id, evaluated_id",
      }
    );

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/profile/${input.evaluatedId}`);
  revalidatePath("/leaderboard");
  revalidatePath("/dashboard");
  return { success: true };
}
