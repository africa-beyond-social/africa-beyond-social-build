import { ImageResponse } from "next/og"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const maxDuration = 15

function cleanText(value: unknown, fallback = "") {
  return String(value ?? fallback)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
}

function wrapText(value: string, maxChars: number, maxLines: number) {
  const words = value.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ""

  for (const word of words) {
    const candidate = line ? line + " " + word : word
    if (candidate.length <= maxChars || !line) {
      line = candidate
    } else {
      lines.push(line)
      line = word
      if (lines.length === maxLines - 1) break
    }
  }

  if (lines.length < maxLines && line) lines.push(line)
  const usedWords = lines.join(" ").split(/\s+/).filter(Boolean).length
  if (usedWords < words.length && lines.length) {
    lines[lines.length - 1] = lines[lines.length - 1].replace(/[.…]$/, "") + "…"
  }
  return lines
}

function storyLabel(category: string, storyType: string) {
  const value = (category + " " + storyType).toLowerCase()
  if (/business|econom|finance|market|company|trade/.test(value)) return "BUSINESS"
  if (/education|school|exam|university|zimsec/.test(value)) return "EDUCATION"
  if (/court|legal|law|justice/.test(value)) return "LAW & JUSTICE"
  if (/health|medical|hospital|disease/.test(value)) return "HEALTH"
  if (/sport|football|soccer|rugby|cricket/.test(value)) return "SPORT"
  if (/agri|farm|food|drought|crop/.test(value)) return "AGRICULTURE"
  if (/politic|parliament|government|election|president/.test(value)) return "PUBLIC AFFAIRS"
  if (/culture|music|arts|heritage/.test(value)) return "CULTURE"
  return storyType === "analysis" ? "ANALYSIS" : "NEWS"
}

async function imageAsDataUri(url: string | null) {
  if (!url || !/^https?:\/\//i.test(url)) return null

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(4500),
      headers: { "user-agent": "AfricaAndBeyond-Newsroom-Thumbnail/1.0" },
    })
    if (!response.ok) return null

    const type = (response.headers.get("content-type") || "").split(";")[0].toLowerCase()
    const length = Number(response.headers.get("content-length") || 0)
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(type)) return null
    if (length > 8 * 1024 * 1024) return null

    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.byteLength > 8 * 1024 * 1024) return null

    return `data:${type === "image/jpg" ? "image/jpeg" : type};base64,${Buffer.from(bytes).toString("base64")}`
  } catch {
    return null
  }
}

function fallbackBase64() {
  return null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const db = createAdminClient()

  const { data: story, error } = await db
    .from("newsroom_stories")
    .select("id,title,summary,image_url,story_type,source_name,detected_at")
    .eq("id", id)
    .maybeSingle()

  if (error || !story) {
    return new ImageResponse(
      (
        <div style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "70px",
          background: "#111",
          color: "white",
          fontFamily: "Arial, sans-serif",
        }}>
          <div style={{ fontSize: 34, fontWeight: 800 }}>AFRICA &amp; BEYOND</div>
          <div style={{ marginTop: 20, fontSize: 54, fontWeight: 900 }}>NEWS | ANALYSIS | PERSPECTIVE</div>
        </div>
      ),
      { width: 1200, height: 675 },
    )
  }

  const title = cleanText(story.title, "Africa & Beyond")
  const dek = cleanText(story.summary)
  const category = cleanText((story as any).category, story.story_type || "News")
  const storyType = cleanText(story.story_type, "news")
  const label = storyLabel(category, storyType)
  const titleLines = wrapText(title, title.length > 85 ? 31 : 37, 3)
  const dekLines = wrapText(dek, 74, 2)
  let sourceImage = await imageAsDataUri(story.image_url || null)
  if (!sourceImage) {
    const { data: submission } = await db
      .from("newsroom_source_submissions")
      .select("storage_path,mime_type")
      .eq("newsroom_story_id", id)
      .maybeSingle()
    if (submission?.storage_path && /^image\/(png|jpeg|jpg|webp)$/i.test(String(submission.mime_type || ""))) {
      const signed = await db.storage.from("wigod-knowledge").createSignedUrl(submission.storage_path, 300)
      if (!signed.error && signed.data?.signedUrl) sourceImage = await imageAsDataUri(signed.data.signedUrl)
    }
  }

  return new ImageResponse(
    (
      <div style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: "#111",
        color: "white",
        fontFamily: "Arial, sans-serif",
      }}>
        {sourceImage ? (
          <img
            src={sourceImage}
            width="1200"
            height="675"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "1200px",
              height: "675px",
              objectFit: "cover",
            }}
          />
        ) : (
          <div style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "1200px",
            height: "675px",
            display: "flex",
            background: "linear-gradient(135deg, #17212b 0%, #050505 65%, #7a0d0d 100%)",
          }} />
        )}

        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "1200px",
          height: "675px",
          display: "flex",
          background: "linear-gradient(90deg, rgba(0,0,0,0.93) 0%, rgba(0,0,0,0.78) 42%, rgba(0,0,0,0.20) 76%, rgba(0,0,0,0.35) 100%)",
        }} />

        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "1200px",
          height: "11px",
          display: "flex",
          background: "#e31b23",
        }} />

        <div style={{
          position: "absolute",
          left: "54px",
          top: "46px",
          display: "flex",
          alignItems: "center",
          background: "#d71920",
          padding: "9px 20px",
          fontSize: "26px",
          fontWeight: 900,
          letterSpacing: "1px",
        }}>
          {label}
        </div>

        <div style={{
          position: "absolute",
          left: "54px",
          top: "125px",
          width: "690px",
          display: "flex",
          flexDirection: "column",
        }}>
          {titleLines.map((line, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                fontSize: titleLines.length >= 3 ? "55px" : "64px",
                lineHeight: 1.04,
                fontWeight: 950,
                letterSpacing: "-1px",
                textTransform: "uppercase",
                textShadow: "3px 3px 8px rgba(0,0,0,0.55)",
              }}
            >
              {line}
            </div>
          ))}
        </div>

        {dekLines.length ? (
          <div style={{
            position: "absolute",
            left: "54px",
            top: "390px",
            width: "650px",
            display: "flex",
            flexDirection: "column",
            background: "rgba(0,0,0,0.88)",
            borderLeft: "8px solid #ffd400",
            padding: "15px 20px",
          }}>
            {dekLines.map((line, index) => (
              <div key={index} style={{
                display: "flex",
                fontSize: "25px",
                lineHeight: 1.22,
                fontWeight: 700,
              }}>
                {line}
              </div>
            ))}
          </div>
        ) : null}

        <div style={{
          position: "absolute",
          left: "54px",
          bottom: "35px",
          display: "flex",
          flexDirection: "column",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            fontSize: "34px",
            fontWeight: 950,
            letterSpacing: "-1px",
          }}>
            <span style={{ color: "#e31b23", marginRight: "10px" }}>|</span>
            AFRICA &amp; BEYOND
          </div>
          <div style={{
            display: "flex",
            marginLeft: "19px",
            marginTop: "3px",
            fontSize: "17px",
            fontWeight: 700,
            letterSpacing: "2px",
          }}>
            NEWS | ANALYSIS | PERSPECTIVE
          </div>
        </div>

        <div style={{
          position: "absolute",
          right: "42px",
          bottom: "42px",
          display: "flex",
          background: "rgba(0,0,0,0.86)",
          borderLeft: "6px solid #1d73e8",
          padding: "12px 18px",
          fontSize: "16px",
          fontWeight: 700,
          letterSpacing: "1px",
        }}>
          PEOPLE. PLACES. PERSPECTIVES.
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 675,
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  )
}
