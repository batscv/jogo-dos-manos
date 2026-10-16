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

  const supabase = await createClient();
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

  if (!/^[a-z0-9_]{3,30}$/.test(username)) return { error: "Use de 3 a 30 letras, números ou _ no username." };
  if (password.length < 6) return { error: "A senha deve ter pelo menos 6 caracteres." };
  if (avatarFile && avatarFile.size > 0 && (!["image/jpeg", "image/png", "image/webp"].includes(avatarFile.type) || avatarFile.size > 5 * 1024 * 1024)) {
    return { error: "Escolha uma foto JPG, PNG ou WEBP de até 5MB." };
  }
  const supabase = await createClient();

  // Verifica se username já existe
  const { data: existingUser } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existingUser) {
    return { error: "Este nome de usuário já está em uso." };
  }

  let avatarUrl: string | null = null;

  // Realiza o cadastro do usuário com metadados
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` : undefined,
      data: {
        full_name: fullName,
        username,
        is_brother: isBrother,
      },
    },
  });

  if (signUpError || !authData.user) {
    return { error: signUpError?.message || "Erro ao registrar usuário." };
  }

  if (!authData.session) {
    return { message: "Conta criada! Confirme o email antes de entrar. Depois poderá adicionar a foto no seu perfil." };
  }

  // Se houver arquivo de avatar, faz o upload para o bucket avatars
  if (avatarFile && avatarFile.size > 0) {
    const fileExt = avatarFile.name.split(".").pop();
    const fileName = `${authData.user.id}/${Date.now()}.${fileExt}`;

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
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
