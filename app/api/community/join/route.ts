import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL("/auth/login", request.url), 303)
  const form = await request.formData()
  const communityId = String(form.get("community_id") ?? "")
  const joined = String(form.get("joined") ?? "false") === "true"
  if (!communityId) return NextResponse.redirect(new URL("/community", request.url), 303)
  if (joined) await supabase.from("community_members").delete().eq("community_id", communityId).eq("user_id", user.id)
  else await supabase.from("community_members").upsert({ community_id: communityId, user_id: user.id, role: "member" }, { onConflict: "community_id,user_id" })
  return NextResponse.redirect(new URL("/community", request.url), 303)
}
