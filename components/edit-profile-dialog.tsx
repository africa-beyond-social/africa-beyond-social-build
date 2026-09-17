"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { updateProfile } from "@/lib/actions"
import { createClient } from "@/lib/supabase/client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserAvatar } from "@/components/user-avatar"
import type { Profile } from "@/lib/types"

export function EditProfileDialog({ profile }: { profile: Profile }) {
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [displayName, setDisplayName] = useState(profile.display_name ?? "")
  const [username, setUsername] = useState(profile.username)
  const [bio, setBio] = useState(profile.bio ?? "")
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile photo must be smaller than 5MB.")
      return
    }

    setAvatarFile(file)

    const preview = URL.createObjectURL(file)
    setPreviewUrl(preview)
  }

  async function save() {
    setLoading(true)

    try {
      const supabase = createClient()

      let finalAvatarUrl = avatarUrl

      if (avatarFile) {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          toast.error("You must be signed in to upload a photo.")
          setLoading(false)
          return
        }

        const fileExt = avatarFile.name.split(".").pop() || "jpg"

        const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, avatarFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: avatarFile.type,
          })

        if (uploadError) {
          toast.error(uploadError.message)
          setLoading(false)
          return
        }

        const { data } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath)

        finalAvatarUrl = data.publicUrl
      }

      const res = await updateProfile({
        display_name: displayName,
        username,
        bio,
        avatar_url: finalAvatarUrl,
      })

      if (!res.ok) {
        toast.error(res.error)
        setLoading(false)
        return
      }

      toast.success("Profile updated.")

      setAvatarUrl(finalAvatarUrl)
      setAvatarFile(null)
      setPreviewUrl(null)
      setOpen(false)

      router.push(`/profile/${username.trim().toLowerCase()}`)
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error("Something went wrong while updating your profile.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className="rounded-full font-semibold"
          >
            Edit profile
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg">
            Edit profile
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">

          {/* Profile photo */}
          <div className="flex items-center gap-4">
            <UserAvatar
              displayName={displayName || profile.display_name}
              username={username || profile.username}
              avatarUrl={previewUrl || avatarUrl || null}
              className="size-20 text-xl"
            />

            <div className="flex-1">
              <Label htmlFor="avatar">Profile photo</Label>

              <Input
                id="avatar"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="mt-2"
              />

              <p className="mt-1 text-xs text-muted-foreground">
                JPG, PNG or other image. Maximum 5MB.
              </p>
            </div>
          </div>

          {/* Display name */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="display_name">
              Display name
            </Label>

            <Input
              id="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
            />
          </div>

          {/* Username */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">
              Username
            </Label>

            <div className="flex items-center rounded-lg border border-border px-3">
              <span className="text-sm text-muted-foreground">
                @
              </span>

              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={24}
                className="border-0 focus-visible:ring-0"
              />
            </div>
          </div>

          {/* Bio */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="bio">
              Bio
            </Label>

            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={160}
              placeholder="Tell people about yourself"
              className="w-full resize-none rounded-lg border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />

            <span className="self-end text-xs text-muted-foreground">
              {160 - bio.length}
            </span>
          </div>

        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>

          <Button
            onClick={save}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
