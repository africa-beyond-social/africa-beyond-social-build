import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function AuthErrorPage() {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex flex-col items-center gap-4 pt-8 pb-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-6" />
        </span>
        <div>
          <h1 className="mb-1 font-serif text-xl font-bold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t complete that authentication step. The link may have expired. Please try again.
          </p>
        </div>
        <Button render={<Link href="/auth/login" />} className="w-full" size="lg">
          Back to sign in
        </Button>
      </CardContent>
    </Card>
  )
}
