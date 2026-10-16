import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
export const runtime = "edge";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.redirect(new URL("/login?confirmation=failed", request.url));
}
