import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { WigodLiveViewer } from "@/components/wigod-live-viewer"

export default async function PublicLiveRoom({
  params,
}: {
  params: Promise<{ room: string }>
}) {
  const { room } = await params
  const { data } = await createAdminClient()
    .from("live_events")
    .select("title,description,thumbnail_url,category,status,room_name")
    .eq("room_name", room)
    .eq("status", "live")
    .maybeSingle()

  if (!data) notFound()

  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between">
          <a href="/" className="text-sm font-black tracking-tight">WIGOD</a>
          <span className="rounded-full bg-brand-red/10 px-3 py-1.5 text-[10px] font-black uppercase text-brand-red">Live now</span>
        </div>
        <WigodLiveViewer room={data.room_name} title={data.title} />
        <section className="mt-5 rounded-2xl border border-border p-4">
          <h1 className="font-serif text-xl font-bold">{data.title}</h1>
          {data.description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{data.description}</p> : null}
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">People. Places. Perspectives.</p>
        </section>
      </div>
    </main>
  )
}
