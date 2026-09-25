"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Paperclip, Send, Mic, Square, Loader2 } from "lucide-react"
import { sendMessage } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function MessageComposer({ recipientId }: { recipientId: string }) {
  const [content, setContent] = useState("")
  const [recording, setRecording] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [pending, setPending] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  async function uploadAttachment(file: File) {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("recipientId", recipientId)
      formData.append("file", file)
      const response = await fetch("/api/messages/attachment", { method: "POST", body: formData })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "File upload failed.")
      toast.success(file.type.startsWith("audio/") ? "Voice message sent." : "File sent.")
      if (inputRef.current) inputRef.current.value = ""
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the file.")
    } finally {
      setUploading(false)
    }
  }

  async function chooseFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) await uploadAttachment(file)
  }

  async function startRecording() {
    if (!window.isSecureContext) return toast.error("Audio recording requires the secure HTTPS version of WIGOD.")
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return toast.error("This browser does not support voice recording.")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
      const mime = candidates.find((type) => MediaRecorder.isTypeSupported(type)) || ""
      const mediaRecorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      chunks.current = []
      recorder.current = mediaRecorder
      setSeconds(0)
      setRecording(true)
      mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.current.push(event.data) }
      mediaRecorder.onerror = () => {
        stream.getTracks().forEach((track) => track.stop())
        setRecording(false)
        toast.error("The browser could not record this audio.")
      }
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        if (timer.current) clearInterval(timer.current)
        setRecording(false)
        const type = mediaRecorder.mimeType || mime || "audio/webm"
        const blob = new Blob(chunks.current, { type })
        if (!blob.size) return toast.error("No audio was recorded.")
        const extension = type.includes("mp4") ? "m4a" : "webm"
        await uploadAttachment(new File([blob], `voice-message-${Date.now()}.${extension}`, { type }))
      }
      mediaRecorder.start(250)
      timer.current = setInterval(() => setSeconds((value) => value + 1), 1000)
    } catch (error) {
      setRecording(false)
      toast.error(error instanceof DOMException && error.name === "NotAllowedError"
        ? "Microphone permission was denied. Allow microphone access and try again."
        : "Microphone is unavailable.")
    }
  }

  function stopRecording() {
    if (recorder.current?.state === "recording") recorder.current.stop()
  }

  function submit() {
    const value = content.trim()
    if (!value || pending || uploading || recording) return
    setPending(true)
    void (async () => {
      try {
        const response = await sendMessage(recipientId, value)
        if (!response.ok) return toast.error(response.error)
        setContent("")
        router.refresh()
      } finally {
        setPending(false)
      }
    })()
  }

  return (
    <div className="sticky bottom-0 mt-6 border-t border-border bg-background/95 py-3 backdrop-blur">
      {recording && (
        <div className="mb-2 flex items-center justify-between rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs">
          <span className="font-semibold">Recording voice message · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</span>
          <button type="button" onClick={stopRecording} className="font-semibold text-red-600">Stop & send</button>
        </div>
      )}
      {uploading && <div className="mb-2 flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-xs"><Loader2 className="size-3 animate-spin" />Sending attachment…</div>}
      <div className="flex items-end gap-2">
        <input ref={inputRef} type="file" accept="image/*,audio/*,application/pdf" className="hidden" onChange={chooseFile} />
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={pending || recording || uploading} className="size-10 shrink-0 rounded-xl p-0" aria-label="Attach image, audio or PDF" title="Send image, audio or PDF"><Paperclip className="size-4" /></Button>
        <Button type="button" variant={recording ? "default" : "outline"} onClick={recording ? stopRecording : startRecording} disabled={pending || uploading} className="size-10 shrink-0 rounded-xl p-0" aria-label={recording ? "Stop and send recording" : "Record and send voice message"} title={recording ? "Stop and send recording" : "Record voice message"}>{recording ? <Square className="size-4" /> : <Mic className="size-4" />}</Button>
        <textarea value={content} onChange={(event) => setContent(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit() } }} placeholder={recording ? "Recording voice message..." : uploading ? "Sending attachment..." : "Write a message..."} rows={1} maxLength={2000} className="min-h-10 flex-1 resize-none rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm outline-none" />
        <Button type="button" onClick={submit} disabled={pending || recording || uploading || !content.trim()} className="size-10 shrink-0 rounded-xl p-0" aria-label="Send message" title="Send message">{pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}</Button>
      </div>
      <p className="mt-1 px-1 text-[10px] text-muted-foreground">Images, audio and PDF files up to 50 MB are sent privately. Tap the microphone to record and send a voice message.</p>
    </div>
  )
}
