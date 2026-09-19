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
  const primary = g.primaryColor || "#0f8f4f"
  const accent = g.accentColor || "#d62828"
  const banner = g.bannerColor || "#111111"
  const text = g.bannerTextColor || "#ffffff"
  const tickerColor = g.tickerColor || accent

  // Clean top identity: one WIGOD/Africa & Beyond mark and one live/time cluster.
  drawLogo(ctx, logo, width)

  if (g.liveStampOn || (g.broadcastTimeOn && g.liveClock)) {
    const liveW = g.liveStampOn ? 112 : 0
    const timeW = g.broadcastTimeOn && g.liveClock ? 154 : 0
    const gap = liveW && timeW ? 6 : 0
    const totalW = liveW + gap + timeW
    const x = width - totalW - 34
    const y = 28

    if (g.liveStampOn) {
      ctx.fillStyle = accent
      roundRect(ctx, x, y, liveW, 42, 7)
      ctx.fill()
      ctx.fillStyle = "#fff"
      ctx.font = "900 18px Arial"
      ctx.fillText("● LIVE", x + 21, y + 27)
    }

    if (g.broadcastTimeOn && g.liveClock) {
      const tx = x + liveW + gap
      ctx.fillStyle = "rgba(10,10,10,.86)"
      roundRect(ctx, tx, y, timeW, 42, 7)
      ctx.fill()
      ctx.fillStyle = text
      ctx.font = "700 17px Arial"
      ctx.fillText(g.liveClock, tx + 18, y + 27)
    }
  }

  if (g.screenTextOn && g.screenText) {
    ctx.font = "700 30px Arial"
    const tw = Math.min(ctx.measureText(g.screenText).width + 70, width - 140)
    const y = g.screenTextPosition === "middle" ? height / 2 - 30 : g.screenTextPosition === "bottom" ? height - 260 : 120
    ctx.fillStyle = "rgba(0,0,0,.78)"
    roundRect(ctx, 70, y, tw, 64, 8)
    ctx.fill()
    ctx.fillStyle = "#fff"
    ctx.fillText(g.screenText.slice(0, 100), 105, y + 42)
  }

  // Presenter identification sits above the headline band.
  if (g.lowerThird) {
    const name = g.lowerName || "WIGOD LIVE"
    const role = g.lowerRole || ""
    const y = height - 292
    ctx.fillStyle = "rgba(10,10,10,.92)"
    roundRect(ctx, 54, y, 700, 82, 8)
    ctx.fill()
    ctx.fillStyle = primary
    ctx.fillRect(54, y, 8, 82)
    ctx.fillStyle = text
    ctx.font = "900 27px Arial"
    ctx.fillText(name.slice(0, 42), 84, y + 35)
    ctx.font = "500 18px Arial"
    ctx.fillStyle = "rgba(255,255,255,.78)"
    ctx.fillText(role.slice(0, 58), 84, y + 63)
  }

  // Main newsroom headline: a single strong, readable strap.
  if (g.headlineOn && g.headlines?.trim()) {
    const lines = g.headlines.split("\n").map(v => v.trim()).filter(Boolean)
    const headline = lines[g.headlineIndex || 0] || lines[0] || "WIGOD NEWS"
    const y = height - 204
    const h = 82
    const x = 54
    const w = width - 108

    ctx.fillStyle = "rgba(8,8,8,.94)"
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = primary
    ctx.fillRect(x, y, 9, h)

    ctx.fillStyle = accent
    ctx.fillRect(x + 9, y, 154, h)

    ctx.fillStyle = "#fff"
    ctx.font = "900 15px Arial"
    ctx.fillText("AFRICA & BEYOND", x + 28, y + 28)
    ctx.font = "900 29px Arial"
    ctx.fillText(headline.slice(0, 92), x + 190, y + 50)

    if (g.liveStampOn) {
      ctx.fillStyle = "#fff"
      ctx.font = "900 14px Arial"
      ctx.fillText("LIVE", x + w - 76, y + 30)
    }
    if (g.broadcastTimeOn && g.liveClock) {
      ctx.fillStyle = "rgba(255,255,255,.72)"
      ctx.font = "600 14px Arial"
      ctx.fillText(g.liveClock, x + w - 108, y + 54)
    }
  }

  // Full-width ticker remains visually separate from the headline.
  if (g.tickerOn && g.ticker) {
    const h = g.tickerHeight === "large" ? 68 : g.tickerHeight === "medium" ? 56 : 48
    const y = height - h

    ctx.fillStyle = tickerColor
    ctx.fillRect(0, y, width, h)

    ctx.fillStyle = "#111"
    ctx.fillRect(0, y, 132, h)
    ctx.fillStyle = "#fff"
    ctx.font = "900 17px Arial"
    ctx.fillText("NEWS", 48, y + Math.round(h / 2) + 6)

    ctx.save()
    ctx.beginPath()
    ctx.rect(132, y, width - 132, h)
    ctx.clip()

    ctx.fillStyle = text
    ctx.font = g.tickerHeight === "large" ? "700 28px Arial" : g.tickerHeight === "medium" ? "700 23px Arial" : "700 20px Arial"
    tickerX.current -= Math.max(0.5, (g.tickerSpeed || 36) / 14)
    const tw = ctx.measureText(g.ticker).width
    if (tickerX.current < 132 - tw - 80) tickerX.current = width
    ctx.fillText(g.ticker, tickerX.current, y + Math.round(h / 2) + 7)
    ctx.restore()
  }
}
