import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (error) {
    console.error("Session middleware failed", error);
    return Response.json({
      error: "session_initialization_failed",
      reason: error instanceof Error ? error.message : "Unknown session error",
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export const config = {
  matcher: [
    /*
     * Aplica o middleware a todas as rotas exceto:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagens)
     * - favicon.ico (ícone do navegador)
     * - extensões de imagem comuns (svg, png, jpg, jpeg, gif, webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
