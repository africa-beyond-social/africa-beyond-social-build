import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MailCheck } from "lucide-react"

export default function SignUpSuccessPage() {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex flex-col items-center gap-4 pt-8 pb-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-accent text-brand-green">
          <MailCheck className="size-6" />
        </span>
        <div>
          <h1 className="mb-1 font-serif text-xl font-bold">Check your inbox</h1>
          <p className="text-sm text-muted-foreground">
            We&apos;ve sent a confirmation link to your email. Confirm your address, then sign in to start posting.
          </p>
        </div>
        <Button render={<Link href="/auth/login" />} className="w-full" size="lg">
          Back to sign in
        </Button>
      </CardContent>
    </Card>
  )
}
