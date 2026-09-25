"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Paperclip, Send, Mic, Square } from "lucide-react"
import { sendMessage } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function MessageComposer({ recipientId }: { recipientId: string }) {
  const [content, setContent] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  function chooseFile() {
    inputRef.current?.click()
  }

  function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Audio recording is not supported by this browser.")
      return
    }

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
            ? "audio/webm"
            : "audio/mp4"

        const mediaRecorder = new MediaRecorder(stream, { mimeType: mime })
        chunks.current = []
        recorder.current = mediaRecorder
        setSeconds(0)
        setRecording(true)

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.current.push(event.data)
        }

        mediaRecorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop())
          const blob = new Blob(chunks.current, { type: mime })
          const extension = mime.includes("mp4") ? "m4a" : "webm"
          setFile(new File([blob], "voice-message-" + Date.now() + "." + extension, { type: mime }))
          if (timer.current) clearInterval(timer.current)
          setRecording(false)
        }

        mediaRecorder.start()
        timer.current = setInterval(() => setSeconds((value) => value + 1), 1000)
      })
      .catch(() => toast.error("Microphone permission was denied or unavailable."))
  }

  function stopRecording() {
    if (recorder.current?.state === "recording") recorder.current.stop()
  }

  function submit() {
    const value = content.trim()

    if (file) {
      startTransition(async () => {
        const formData = new FormData()
        formData.append("recipientId", recipientId)
        formData.append("file", file)

        const response = await fetch("/api/messages/attachment", {
          method: "POST",
          body: formData,
        })
        const data = await response.json()

        if (!response.ok) {
          toast.error(data.error || "File upload failed.")
          return
        }

        setFile(null)
        setContent("")
        if (inputRef.current) inputRef.current.value = ""
        router.refresh()
      })
      return
    }

    if (!value) return

    startTransition(async () => {
      const response = await sendMessage(recipientId, value)

      if (!response.ok) {
        toast.error(response.error)
        return
      }

      setContent("")
      router.refresh()
    })
  }

  return (
    <div className="sticky bottom-0 mt-6 border-t border-border bg-background/95 py-3 backdrop-blur">
      {recording && (
        <div className="mb-2 flex items-center justify-between rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs">
          <span className="font-semibold">
            Recording voice message · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
          </span>
          <button type="button" onClick={stopRecording} className="font-semibold text-red-600">
            Stop
          </button>
        </div>
      )}

      {file && !recording && (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-xs">
          <span className="min-w-0 truncate">
            {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
          </span>
          <button
            type="button"
            onClick={() => {
              setFile(null)
              if (inputRef.current) inputRef.current.value = ""
            }}
            className="font-semibold"
          >
            Remove
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*,audio/*,application/pdf"
          className="hidden"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />

        <Button
          type="button"
          variant="outline"
          onClick={chooseFile}
          disabled={pending || recording}
          className="size-10 shrink-0 rounded-xl p-0"
          aria-label="Attach image, audio or PDF"
        >
          <Paperclip className="size-4" />
        </Button>

        <Button
          type="button"
          variant={recording ? "default" : "outline"}
          onClick={recording ? stopRecording : startRecording}
          disabled={pending}
          className="size-10 shrink-0 rounded-xl p-0"
          aria-label={recording ? "Stop recording" : "Record audio"}
        >
          {recording ? <Square className="size-4" /> : <Mic className="size-4" />}
        </Button>

        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              submit()
            }
          }}
          placeholder={
            recording
              ? "Recording voice message..."
              : file
                ? "Press send to share the file..."
                : "Write a message..."
          }
          rows={1}
          maxLength={2000}
          className="min-h-10 flex-1 resize-none rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm outline-none"
        />

        <Button
          type="button"
          onClick={submit}
          disabled={pending || recording || (!content.trim() && !file)}
          className="size-10 shrink-0 rounded-xl p-0"
          aria-label="Send"
        >
          {pending ? <span className="text-xs">...</span> : <Send className="size-4" />}
        </Button>
      </div>

      <p className="mt-1 px-1 text-[10px] text-muted-foreground">
        Private sharing: images, audio and PDF files up to 50 MB. Tap the microphone to record a voice message.
      </p>
    </div>
  )
}
