"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { dismissNotification } from "@/lib/actions"

export function ClickableNotification({ id, href, children, className }: { id:string; href:string; children:React.ReactNode; className?:string }) {
  const router=useRouter()
  const [busy,setBusy]=useState(false)
  async function handleClick(e:React.MouseEvent<HTMLAnchorElement>){
    e.preventDefault()
    if(busy)return
    setBusy(true)
    await dismissNotification(id)
    router.push(href)
    router.refresh()
  }
  return <Link href={href} onClick={handleClick} aria-busy={busy} className={className}>{children}</Link>
}
