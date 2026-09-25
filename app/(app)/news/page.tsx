import Link from "next/link"
import { Newspaper, ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"

export default async function NewsPage() {
  const supabase = await createClient()
  const { data: articles } = await supabase
    .from("newsroom_articles")
    .select("id,title,slug,dek,body_html,category,tags,featured_image_url,created_at")
    .eq("website_status","published")
    .order("created_at",{ascending:false})
    .limit(30)

  return <div className="mx-auto w-full max-w-4xl px-4 py-6">
    <header className="mb-6 flex items-center gap-3">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-green/10 text-brand-green"><Newspaper className="size-6 text-brand-green" /></div>
      <div><h1 className="text-2xl font-bold">News</h1><p className="text-sm text-muted-foreground">Africa & Beyond — News | Analysis | Perspective</p></div>
    </header>
    <div className="space-y-4">
      {(articles ?? []).map((article) => <article key={article.id} className="overflow-hidden rounded-2xl border border-border bg-background">
        {article.featured_image_url ? <img src={article.featured_image_url} alt="" className="aspect-video w-full object-cover" /> : null}
        <div className="p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-green">{article.category || "News"}</p>
          <h2 className="mt-1 text-xl font-bold">{article.title}</h2>
          {article.dek ? <p className="mt-2 text-sm text-muted-foreground">{article.dek}</p> : null}
          <Link href={article.slug ? `/news/${article.slug}` : `/news?id=${article.id}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-green">Read story <ArrowRight className="size-4" /></Link>
        </div>
      </article>)}
      {!articles?.length && <div className="rounded-2xl border border-dashed border-border p-10 text-center"><h2 className="font-semibold">No published stories yet</h2><p className="mt-1 text-sm text-muted-foreground">Published Africa & Beyond stories will appear here.</p></div>}
    </div>
  </div>
}