import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

async function auth(){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();return {supabase,user}}
export async function POST(req:Request){
 const {supabase,user}=await auth(); if(!user)return NextResponse.json({error:"You must be signed in."},{status:401})
 const body=await req.json(); const action=body.action
 if(action==="create"){const recipientId=String(body.recipientId||"");if(!recipientId||recipientId===user.id)return NextResponse.json({error:"Invalid recipient."},{status:400});await supabase.from("call_sessions").update({status:"ended",ended_at:new Date().toISOString()}).eq("caller_id",user.id).eq("status","ringing");const {data,error}=await supabase.from("call_sessions").insert({caller_id:user.id,recipient_id:recipientId,status:"ringing"}).select("id,caller_id,recipient_id,status,created_at").single();if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json({session:data})}
 if(action==="status"){const sessionId=String(body.sessionId||"");const status=String(body.status||"");if(!sessionId||!["accepted","rejected","ended","missed"].includes(status))return NextResponse.json({error:"Invalid call status."},{status:400});const patch:Record<string,string>={status};if(status==="accepted")patch.answered_at=new Date().toISOString();if(["ended","rejected","missed"].includes(status))patch.ended_at=new Date().toISOString();const {data,error}=await supabase.from("call_sessions").update(patch).eq("id",sessionId).select("id,status").single();if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json({session:data})}
 if(action==="signal"){const sessionId=String(body.sessionId||"");const kind=String(body.kind||"");if(!sessionId||!["offer","answer","ice","hangup"].includes(kind))return NextResponse.json({error:"Invalid signal."},{status:400});const {data,error}=await supabase.from("call_signals").insert({session_id:sessionId,sender_id:user.id,kind,payload:body.payload??{}}).select("id").single();if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json({ok:true,id:data.id})}
 return NextResponse.json({error:"Unknown action."},{status:400})
}
export async function GET(req:Request){
 const {supabase,user}=await auth(); if(!user)return NextResponse.json({error:"You must be signed in."},{status:401})
 const url=new URL(req.url); const sessionId=url.searchParams.get("session"); const incoming=url.searchParams.get("incoming")
 if(sessionId){const {data:session}=await supabase.from("call_sessions").select("id,caller_id,recipient_id,status,created_at,answered_at,ended_at").eq("id",sessionId).maybeSingle();if(!session)return NextResponse.json({error:"Call not found."},{status:404});const {data:signals}=await supabase.from("call_signals").select("id,sender_id,kind,payload,created_at").eq("session_id",sessionId).order("created_at",{ascending:true}).order("id",{ascending:true});return NextResponse.json({session,signals:signals??[]})}
 if(incoming){const {data}=await supabase.from("call_sessions").select("id,caller_id,recipient_id,status,created_at").eq("recipient_id",user.id).eq("status","ringing").order("created_at",{ascending:false}).limit(3);return NextResponse.json({calls:data??[]})}
 return NextResponse.json({calls:[]})
}
