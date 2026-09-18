"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Preencha todos os campos obrigatórios." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function register(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const username = (formData.get("username") as string)?.toLowerCase().trim();
  const isBrother = formData.get("isBrother") === "true";
  const avatarFile = formData.get("avatar") as File | null;

  if (!email || !password || !fullName || !username) {
    return { error: "Nome completo, username, email e senha são obrigatórios." };
  }

  const supabase = createClient();

  // Verifica se username já existe
  const { data: existingUser } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .single();

  if (existingUser) {
    return { error: "Este nome de usuário já está em uso." };
  }

  let avatarUrl: string | null = null;

  // Realiza o cadastro do usuário com metadados
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        username,
        is_brother: isBrother,
        is_admin: false,
        is_paid: false,
      },
    },
  });

  if (signUpError || !authData.user) {
    return { error: signUpError?.message || "Erro ao registrar usuário." };
  }

  // Se houver arquivo de avatar, faz o upload para o bucket avatars
  if (avatarFile && avatarFile.size > 0) {
    const fileExt = avatarFile.name.split(".").pop();
    const fileName = `${authData.user.id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, avatarFile, {
        cacheControl: "3600",
        upsert: true,
      });

    if (!uploadError) {
      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      avatarUrl = publicUrlData.publicUrl;

      // Atualiza o perfil recém-criado pelo trigger com a URL pública da foto
      await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", authData.user.id);
    }
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
