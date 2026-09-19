"use client"

import { useEffect, useRef } from "react"
import { drawWigodGraphics, type WigodGraphicsState } from "./wigod-graphics-renderer"

export function WigodGraphicsPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const logoRef = useRef<HTMLImageElement>(null)
  const graphicsRef = useRef<WigodGraphicsState>({})
  const tickerRef = useRef({ current: 1920 })
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<WigodGraphicsState>).detail || {}
      graphicsRef.current = detail
      if (logoRef.current) logoRef.current.src = detail.logoUrl || ""
    }
    window.addEventListener("wigod-studio-graphics", sync)
    const current = (window as Window & { __wigodStudioGraphics?: WigodGraphicsState }).__wigodStudioGraphics
    if (current) sync(new CustomEvent("wigod-studio-graphics", { detail: current }))

    const draw = () => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d")
      if (!ctx) return
      ctx.clearRect(0, 0, 1920, 1080)
      drawWigodGraphics(ctx, graphicsRef.current, logoRef.current, tickerRef.current)
      frameRef.current = requestAnimationFrame(draw)
    }
    frameRef.current = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener("wigod-studio-graphics", sync)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [])

  return (
    <>
      <canvas ref={canvasRef} width={1920} height={1080} className="pointer-events-none absolute inset-0 z-40 size-full" />
      <img ref={logoRef} alt="" crossOrigin="anonymous" className="hidden" />
    </>
  )
}
