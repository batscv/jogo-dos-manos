import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Chamado a partir de um Server Component
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch (error) {
            // Chamado a partir de um Server Component
          }
        },
      },
    }
  );
}

// Cliente com Service Role para operações administrativas
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Se houver uma chave service_role válida (não idêntica à anon_key pública)
  if (serviceKey && serviceKey !== process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && serviceKey.length > 50) {
    const { createClient: createSupabaseAdmin } = require("@supabase/supabase-js");
    return createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }

  // Caso contrário, utiliza o cliente autenticado da sessão atual
  return createClient();
}
