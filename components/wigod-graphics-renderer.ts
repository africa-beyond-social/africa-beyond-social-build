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
  backgroundUrl?: string
  backgroundKind?: "picture" | "video" | ""
  mediaUrl?: string
  mediaPlaying?: boolean
  customCameraSide?: "left" | "right"
  customCameraWidth?: number
  customCameraZoom?: number
  customMediaZoom?: number
  customCameraPosition?: string
  customMediaPosition?: string
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function drawLogo(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null, width: number) {
  if (!logo?.naturalWidth) return
  const scale = Math.min(170 / logo.naturalWidth, 62 / logo.naturalHeight)
  ctx.drawImage(logo, 34, 28, logo.naturalWidth * scale, logo.naturalHeight * scale)
}

export function drawWigodGraphics(
  ctx: CanvasRenderingContext2D,
  g: WigodGraphicsState,
  logo: HTMLImageElement | null,
  tickerX: { current: number },
  width = 1920,
  height = 1080,
) {
  const primary = g.primaryColor || "#159447"
  const accent = g.accentColor || "#d62828"
  const banner = g.bannerColor || "#101010"
  const text = g.bannerTextColor || "#ffffff"
  const tickerColor = g.tickerColor || accent

  // WIGOD Newsroom: one shared, broadcast-ready composition used by Studio and Output.
  if (logo?.naturalWidth) {
    const scale = Math.min(150 / logo.naturalWidth, 58 / logo.naturalHeight)
    ctx.drawImage(logo, 34, 28, logo.naturalWidth * scale, logo.naturalHeight * scale)
  }

  if (g.liveStampOn) {
    ctx.fillStyle = accent
    roundRect(ctx, 34, 100, 108, 38, 6)
    ctx.fill()
    ctx.fillStyle = "#fff"
    ctx.font = "900 17px Arial"
    ctx.fillText("● LIVE", 52, 125)
  }

  if (g.broadcastTimeOn && g.liveClock) {
    ctx.fillStyle = "rgba(8,8,8,.88)"
    roundRect(ctx, width - 184, 30, 150, 38, 6)
    ctx.fill()
    ctx.fillStyle = "#fff"
    ctx.font = "700 16px Arial"
    ctx.fillText(g.liveClock, width - 165, 55)
  }

  if (g.screenTextOn && g.screenText) {
    ctx.font = "700 28px Arial"
    const tw = Math.min(ctx.measureText(g.screenText).width + 60, width - 160)
    const y = g.screenTextPosition === "middle" ? height / 2 - 30 : g.screenTextPosition === "bottom" ? height - 300 : 150
    ctx.fillStyle = "rgba(0,0,0,.78)"
    roundRect(ctx, 80, y, tw, 58, 7)
    ctx.fill()
    ctx.fillStyle = "#fff"
    ctx.fillText(g.screenText.slice(0, 100), 110, y + 38)
  }

  // Presenter ID: compact lower-third above the headline.
  if (g.lowerThird) {
    const name = (g.lowerName || "WIGOD LIVE").slice(0, 40)
    const role = (g.lowerRole || "").slice(0, 60)
    const y = height - 286
    const nameW = Math.max(210, Math.min(430, 34 + name.length * 13))
    ctx.fillStyle = primary
    roundRect(ctx, 42, y, nameW, 54, 5)
    ctx.fill()
    ctx.fillStyle = "#fff"
    ctx.font = "900 21px Arial"
    ctx.fillText(name, 60, y + 34)

    if (role) {
      ctx.fillStyle = "rgba(0,0,0,.88)"
      ctx.fillRect(42 + nameW, y, Math.min(600, 32 + role.length * 9), 54)
      ctx.fillStyle = "rgba(255,255,255,.9)"
      ctx.font = "600 17px Arial"
      ctx.fillText(role, 62 + nameW, y + 33)
    }
  }

  if (g.headlineOn && g.headlines?.trim()) {
    const lines = g.headlines.split("\n").map(v => v.trim()).filter(Boolean)
    const headline = (lines[g.headlineIndex || 0] || lines[0] || "WIGOD NEWS").slice(0, 100)
    const y = height - 220
    const h = 72
    const x = 42
    const w = width - 84

    // Red LIVE tab + black headline strap + red time tab: a single coherent newsroom unit.
    ctx.fillStyle = accent
    ctx.fillRect(x, y, 132, h)
    ctx.fillStyle = "#fff"
    ctx.font = "900 16px Arial"
    ctx.fillText(g.liveStampOn ? "LIVE" : "HEADLINES", x + 38, y + 29)
    ctx.font = "800 11px Arial"
    ctx.fillText("AFRICA & BEYOND", x + 20, y + 52)

    ctx.fillStyle = banner
    ctx.fillRect(x + 132, y, w - 250, h)
    ctx.fillStyle = primary
    ctx.fillRect(x + 132, y, 5, h)
    ctx.fillStyle = "#fff"
    ctx.font = "900 14px Arial"
    ctx.fillText("HEADLINES", x + 158, y + 23)
    ctx.font = "900 25px Arial"
    ctx.fillText(headline, x + 158, y + 52)

    if (g.broadcastTimeOn && g.liveClock) {
      ctx.fillStyle = accent
      ctx.fillRect(x + w - 118, y, 118, h)
      ctx.fillStyle = "#fff"
      ctx.font = "900 14px Arial"
      ctx.fillText("LIVE", x + w - 92, y + 25)
      ctx.font = "700 15px Arial"
      ctx.fillText(g.liveClock, x + w - 103, y + 49)
    }
  }

  if (g.tickerOn && g.ticker) {
    const h = g.tickerHeight === "large" ? 58 : g.tickerHeight === "medium" ? 50 : 44
    const y = height - h
    ctx.fillStyle = tickerColor
    ctx.fillRect(0, y, width, h)
    ctx.fillStyle = "#111"
    ctx.fillRect(0, y, 126, h)
    ctx.fillStyle = "#fff"
    ctx.font = "900 15px Arial"
    ctx.fillText("NEWS", 46, y + Math.round(h / 2) + 5)

    ctx.save()
    ctx.beginPath()
    ctx.rect(126, y, width - 126, h)
    ctx.clip()
    ctx.fillStyle = "#fff"
    ctx.font = g.tickerHeight === "large" ? "700 25px Arial" : g.tickerHeight === "medium" ? "700 21px Arial" : "700 18px Arial"
    tickerX.current -= Math.max(0.45, (g.tickerSpeed || 36) / 14)
    const tw = ctx.measureText(g.ticker).width
    if (tickerX.current < 126 - tw - 100) tickerX.current = width
    ctx.fillText(g.ticker, tickerX.current, y + Math.round(h / 2) + 6)
    ctx.restore()
  }
}
