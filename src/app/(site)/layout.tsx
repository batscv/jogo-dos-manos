import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
export const runtime = "edge";
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let profile = null;
  if (user) {
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    profile = data;
  }
  return <><Navbar profile={profile} /><main className="flex-1">{children}</main></>;
}
