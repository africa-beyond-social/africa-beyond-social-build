import Link from "next/link"
import { Store, ShoppingBag, Wrench, ArrowLeft } from "lucide-react"

export default function MarketplacePage() {
  const categories = [
    ["Products", ShoppingBag, "Buy and discover products from WIGOD creators and businesses."],
    ["Services", Wrench, "Find services offered by people and organisations on WIGOD."],
    ["Creator marketplace", Store, "Discover creator offerings, media services and digital work."],
  ] as const

  return <div className="mx-auto w-full max-w-4xl px-4 py-6">
    <header className="mb-6 flex items-center gap-3">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-green/10 text-brand-green"><Store className="size-6" /></div>
      <div><h1 className="text-2xl font-bold">WIGOD Marketplace</h1><p className="text-sm text-muted-foreground">Products, services and creator offerings.</p></div>
    </header>
    <section className="grid gap-4 md:grid-cols-3">
      {categories.map(([name,Icon,description]) => <div key={name} className="rounded-2xl border border-border bg-background p-5">
        <Icon className="size-6 text-brand-green" />
        <h2 className="mt-4 font-bold">{name}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <button type="button" className="mt-5 rounded-full border border-border px-4 py-2 text-xs font-semibold">Browse</button>
      </div>)}
    </section>
    <div className="mt-6 rounded-2xl border border-dashed border-border p-6 text-center">
      <h2 className="font-semibold">Marketplace is ready for listings</h2>
      <p className="mt-1 text-sm text-muted-foreground">Seller listings and checkout can be connected here without changing the WIGOD navigation.</p>
    </div>
    <Link href="/" className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline"><ArrowLeft className="size-4" />Back to WIGOD</Link>
  </div>
}