import Link from "next/link"
import {ArrowLeft,ShieldCheck} from "lucide-react"
import {LiveStudio} from "@/components/live-studio"
import {BroadcastCanvas} from "@/components/broadcast-canvas"
import {getSessionUser} from "@/lib/queries"
function admin(email?:string|null){return Boolean(email&&(process.env.LIVE_ADMIN_EMAILS||"").split(",").map(v=>v.trim().toLowerCase()).includes(email.toLowerCase()))}
export default async function LiveStudioPage(){
 const user=await getSessionUser()
 if(!admin(user?.email))return <div className="px-4 py-12 text-center"><ShieldCheck className="mx-auto size-10 text-brand-red"/><h1 className="mt-4 text-xl font-bold">WIGOD Live Studio</h1><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">This studio is restricted to configured Live administrators.</p><Link href="/live" className="mt-5 inline-flex rounded-full border border-border px-4 py-2 text-xs font-semibold">Back to Live</Link></div>
 return <div className="px-4 py-5"><Link href="/live" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><ArrowLeft className="size-3.5"/>Back to WIGOD Live</Link><div className="mt-5 mb-6"><p className="text-xs font-bold uppercase tracking-wider text-brand-red">WIGOD Live Studio</p><h1 className="mt-1 font-serif text-2xl font-bold">Broadcast workspace</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Prepare and control your WIGOD Live session.</p></div><LiveStudio/><div className="mt-6"><BroadcastCanvas/></div></div>
}