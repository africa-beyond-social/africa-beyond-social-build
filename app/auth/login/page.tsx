"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      // Generic for credential mismatch; pass through actionable states.
      const msg = error.message.toLowerCase()
      if (msg.includes("confirm")) setError("Please confirm your email address before signing in.")
      else if (msg.includes("rate") || error.status === 429) setError("Too many attempts. Please try again shortly.")
      else setError("Invalid email or password.")
      setLoading(false)
      return
    }
    router.push("/")
    router.refresh()
  }
  async function handleForgotPassword() {
  if (!email) {
    setError("Enter your email address first.")
    return
  }

  setError(null)
  setResetLoading(true)

  const supabase = createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })

  if (error) {
    setError(error.message)
  } else {
    setError("Check your email for a password reset link.")
  }

  setResetLoading(false)
}

  return (
    <Card className="rounded-2xl">
      <CardContent className="pt-6">
        <h1 className="mb-1 font-serif text-xl font-bold">Welcome back</h1>
        <p className="mb-6 text-sm text-muted-foreground">Sign in to continue to your feed.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <button
  type="button"
  onClick={handleForgotPassword}
  disabled={resetLoading}
  className="text-sm text-brand-red hover:underline text-left"
>
  {resetLoading ? "Sending reset link..." : "Forgot your password?"}
</button>
          </div>
          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={loading} className="w-full">
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to Africa &amp; Beyond?{" "}
          <Link href="/auth/sign-up" className="font-semibold text-brand-red hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
