import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL("/auth/login", request.url), 303)

  const form = await request.formData()
  const name = String(form.get("name") ?? "").trim()
  const description = String(form.get("description") ?? "").trim()
  const category = String(form.get("category") ?? "General").trim()
  if (!name) return NextResponse.redirect(new URL("/community/create", request.url), 303)

  const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "community"
  let slug = baseSlug
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await supabase.from("communities").select("id").eq("slug", slug).maybeSingle()
    if (!existing) break
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
  }

  const { data: community } = await supabase.from("communities").insert({ name, slug, description: description || null, category: category || "General", creator_id: user.id }).select("id").single()
  if (community) await supabase.from("community_members").insert({ community_id: community.id, user_id: user.id, role: "admin" })
  return NextResponse.redirect(new URL("/community", request.url), 303)
}
