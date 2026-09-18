"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateAvatar(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Você precisa estar conectado para alterar a foto." };
  }

  const avatarFile = formData.get("avatar") as File | null;

  if (!avatarFile || avatarFile.size === 0) {
    return { error: "Selecione uma imagem válida." };
  }

  // Validação básica de tipo de arquivo
  if (!avatarFile.type.startsWith("image/")) {
    return { error: "O arquivo precisa ser uma imagem (PNG, JPG, JPEG, WEBP)." };
  }

  // Limite de 5MB
  if (avatarFile.size > 5 * 1024 * 1024) {
    return { error: "A imagem deve ter no máximo 5MB." };
  }

  const fileExt = avatarFile.name.split(".").pop() || "jpg";
  const fileName = `${user.id}-${Date.now()}.${fileExt}`;

  // Upload para o bucket avatars
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, avatarFile, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    return { error: `Erro no upload: ${uploadError.message}` };
  }

  const { data: publicUrlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(fileName);

  const avatarUrl = publicUrlData.publicUrl;

  // Atualiza a coluna avatar_url na tabela profiles
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (updateError) {
    return { error: `Erro ao salvar perfil: ${updateError.message}` };
  }

  revalidatePath(`/profile/${user.id}`);
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  revalidatePath("/", "layout");

  return { success: true, avatarUrl };
}
