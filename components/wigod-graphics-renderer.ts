export type WigodGraphicsState = {
  layout?: string
  screenText?: string
  screenTextOn?: boolean
  screenTextPosition?: "top" | "middle" | "bottom"
  liveStampOn?: boolean
  broadcastTimeOn?: boolean
  liveClock?: string
  lowerThird?: boolean
  lowerName?: string
  lowerRole?: string
  primaryColor?: string
  accentColor?: string
  bannerColor?: string
  bannerTextColor?: string
  tickerColor?: string
  tickerSpeed?: number
  ticker?: string
  tickerOn?: boolean
  tickerHeight?: "small" | "medium" | "large"
  headlineOn?: boolean
  headlines?: string
  headlineIndex?: number
  logoUrl?: string
}

export function drawWigodGraphics(
  ctx: CanvasRenderingContext2D,
  g: WigodGraphicsState,
  logo: HTMLImageElement | null,
  tickerX: { current: number },
  width = 1920,
  height = 1080,
) {
  const primary = g.primaryColor || "#0f8f4f"
  const accent = g.accentColor || "#d62828"
  const banner = g.bannerColor || "#111111"
  const text = g.bannerTextColor || "#ffffff"

  if (g.logoUrl && !g.headlineOn && logo?.naturalWidth) {
    const scale = Math.min(120 / logo.naturalWidth, 90 / logo.naturalHeight)
    ctx.drawImage(logo, width - logo.naturalWidth * scale - 36, 30, logo.naturalWidth * scale, logo.naturalHeight * scale)
  }

  if (g.liveStampOn) {
    ctx.fillStyle = accent
    ctx.beginPath()
    ctx.roundRect(28, 28, 112, 42, 8)
    ctx.fill()
    ctx.fillStyle = "#fff"
    ctx.font = "900 20px Arial"
    ctx.fillText("● LIVE", 47, 56)
  }

  if (g.broadcastTimeOn && g.liveClock) {
    ctx.fillStyle = "rgba(0,0,0,.78)"
    ctx.beginPath()
    ctx.roundRect(width - 230, 28, 202, 42, 8)
    ctx.fill()
    ctx.fillStyle = text
    ctx.font = "700 18px Arial"
    ctx.fillText(g.liveClock, width - 205, 56)
  }

  if (g.screenTextOn && g.screenText) {
    ctx.font = "700 30px Arial"
    const tw = Math.min(ctx.measureText(g.screenText).width + 70, width - 140)
    const y = g.screenTextPosition === "middle" ? height / 2 - 30 : g.screenTextPosition === "bottom" ? height - 180 : 120
    ctx.fillStyle = "rgba(0,0,0,.75)"
    ctx.beginPath(); ctx.roundRect(70, y, tw, 64, 10); ctx.fill()
    ctx.fillStyle = "#fff"
    ctx.fillText(g.screenText.slice(0, 100), 100, y + 42)
  }

  if (g.lowerThird) {
    const name = g.lowerName || "WIGOD LIVE"
    const role = g.lowerRole || ""
    ctx.fillStyle = banner
    ctx.fillRect(50, height - 188, 760, 82)
    ctx.fillStyle = primary
    ctx.fillRect(50, height - 188, 7, 82)
    ctx.fillStyle = text
    ctx.font = "900 28px Arial"
    ctx.fillText(name, 78, height - 140)
    ctx.font = "400 20px Arial"
    ctx.fillText(role, 78, height - 110)
  }

  if (g.headlineOn && g.headlines?.trim()) {
    const lines = g.headlines.split("\n").map(v => v.trim()).filter(Boolean)
    const headline = lines[g.headlineIndex || 0] || lines[0] || "WIGOD NEWS"
    const y = height - 165
    ctx.fillStyle = banner
    ctx.fillRect(90, y, width - 180, 72)
    ctx.fillStyle = primary
    ctx.fillRect(90, y, 8, 72)
    ctx.fillStyle = accent
    ctx.fillRect(width - 260, y, 170, 72)
    ctx.fillStyle = text
    ctx.font = "900 15px Arial"
    ctx.fillText("HEADLINES", 120, y + 25)
    ctx.font = "900 27px Arial"
    ctx.fillText(headline.slice(0, 86), 120, y + 54)
    ctx.fillStyle = text
    ctx.font = "900 16px Arial"
    ctx.fillText(g.liveStampOn ? "LIVE" : "WIGOD", width - 215, y + 42)
    if (g.broadcastTimeOn && g.liveClock) {
      ctx.font = "700 14px Arial"
      ctx.fillText(g.liveClock, width - 215, y + 61)
    }
  }

  if (g.tickerOn && g.ticker) {
    const h = g.tickerHeight === "large" ? 72 : g.tickerHeight === "medium" ? 58 : 46
    ctx.fillStyle = g.tickerColor || accent
    ctx.fillRect(0, height - h, width, h)
    ctx.fillStyle = text
    ctx.font = g.tickerHeight === "large" ? "700 28px Arial" : g.tickerHeight === "medium" ? "700 24px Arial" : "700 20px Arial"
    tickerX.current -= Math.max(0.5, (g.tickerSpeed || 36) / 12)
    const tw = ctx.measureText(g.ticker).width
    if (tickerX.current < -tw - 100) tickerX.current = width
    ctx.fillText(g.ticker, tickerX.current, height - Math.max(17, Math.round(h / 2) + 7))
  }
}
