"use client"

import { useState, type ReactNode } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { PostComposer } from "@/components/post-composer"
import type { Profile } from "@/lib/types"

export function ComposeDialog({ profile, children }: { profile: Profile | null; children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<span className="contents">{children}</span>} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg">New post</DialogTitle>
        </DialogHeader>
        <div className="pt-2">
          <PostComposer profile={profile} autoFocus onPosted={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
