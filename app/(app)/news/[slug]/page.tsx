import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ArrowLeft } from "lucide-react"

export default async function NewsStoryPage({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params
  const supabase=await createClient()
  const {data:article}=await supabase.from("newsroom_articles").select("id,title,slug,dek,body_html,category,tags,featured_image_url,created_at,source_box").eq("slug",slug).eq("website_status","ready").maybeSingle()
  if(!article) notFound()
  return <article className="mx-auto w-full max-w-3xl px-4 py-6">
    <Link href="/news" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline"><ArrowLeft className="size-4"/>Back to News</Link>
    {article.featured_image_url ? <img src={article.featured_image_url} alt="" className="mb-6 aspect-video w-full rounded-2xl object-cover"/> : null}
    <p className="text-xs font-semibold uppercase tracking-wider text-brand-green">{article.category || "News"}</p>
    <h1 className="mt-2 text-3xl font-bold leading-tight">{article.title}</h1>
    {article.dek ? <p className="mt-3 text-lg text-muted-foreground">{article.dek}</p> : null}
    <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert" dangerouslySetInnerHTML={{__html:article.body_html || ""}} />
    <div className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">Africa & Beyond — News | Analysis | Perspective</div>
  </article>
}