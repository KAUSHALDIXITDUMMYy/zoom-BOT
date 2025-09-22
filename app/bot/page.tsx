"use client"

import { useEffect, useRef, useState } from "react"
import { onSnapshot, doc, updateDoc, getDoc, collection, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useSearchParams } from "next/navigation"

// Lightweight bot agent page: auto-joins Zoom via Meeting SDK when requested and relays audio to SSE
export default function BotAgentPage() {
  const search = useSearchParams()
  const meetingDocId = search.get("meetingId") // Firestore document id (optional)
  const [status, setStatus] = useState("idle")
  const [activeDocId, setActiveDocId] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    // If a specific meeting doc is provided, only watch that. Otherwise, watch all meetings requesting bot.
    if (meetingDocId) {
      const unsubscribe = onSnapshot(doc(db, "meetings", meetingDocId), async (snap) => {
        const data = snap.data() as any
        if (!data) return

        if (data.botJoinRequested && status !== "streaming") {
          if (activeDocId && activeDocId !== meetingDocId) {
            // Stop any previous streaming session before switching
            stopStreaming()
          }
          setActiveDocId(meetingDocId)
          setStatus("joining")
          try {
            await joinZoomMeeting(meetingDocId)
            await startCaptureAndStream(meetingDocId)
            await updateDoc(doc(db, "meetings", meetingDocId), { botJoined: true, status: "live" })
            setStatus("streaming")
          } catch (e) {
            console.error("[BotAgent] Failed to start streaming", e)
            setStatus("error")
          }
        }

        if (!data.botJoinRequested && activeDocId === meetingDocId && status === "streaming") {
          stopStreaming()
          setActiveDocId(null)
          setStatus("idle")
        }
      })

      return () => {
        unsubscribe()
        stopStreaming()
      }
    }

    // Global watcher for any meeting requesting bot join
    const unsubscribeAll = onSnapshot(
      query(collection(db, "meetings"), where("botJoinRequested", "==", true)),
      async (snap) => {
        // Pick the first meeting requesting join if not already streaming
        if (status !== "streaming") {
          const first = snap.docs[0]
          if (!first) return
          const docId = first.id
          setActiveDocId(docId)
          setStatus("joining")
          try {
            await joinZoomMeeting(docId)
            await startCaptureAndStream(docId)
            await updateDoc(doc(db, "meetings", docId), { botJoined: true, status: "live" })
            setStatus("streaming")
          } catch (e) {
            console.error("[BotAgent] Failed to start streaming", e)
            setStatus("error")
          }
        }
      },
    )

    return () => {
      unsubscribeAll()
      stopStreaming()
    }
  }, [meetingDocId, status, activeDocId])

  const joinZoomMeeting = async (docId: string) => {
    const d = await getDoc(doc(db, "meetings", docId))
    const data = d.data() as any
    if (!data) throw new Error("Meeting not found")

    const meetingNumber = data.meetingId
    const password = data.meetingPassword || ""

    // Get signature (and sdkKey) from server
    const sigResp = await fetch("/api/zoom-signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingNumber, role: 0 }),
    })
    if (!sigResp.ok) throw new Error("Failed to get signature")
    const { signature, sdkKey } = await sigResp.json()

    // Dynamically import SDK in client
    const { ZoomMtg } = await import("@zoom/meetingsdk")
    // Inject Zoom CSS if not present
    ensureZoomCss()
    // Configure SDK static assets
    ZoomMtg.setZoomJSLib("https://source.zoom.us/2.17.0/lib", "/av")
    ZoomMtg.preLoadWasm()
    ZoomMtg.prepareJssdk()
    try {
      // Optional: load i18n
      // @ts-ignore
      ZoomMtg.i18n?.load?.("en-US")
      // @ts-ignore
      ZoomMtg.i18n?.reload?.("en-US")
    } catch {}

    await new Promise<void>((resolve, reject) => {
      ZoomMtg.init({
        leaveUrl: window.location.origin + "/bot?meetingId=" + docId,
        disableInvite: true,
        disableCallOut: true,
        isSupportAV: true,
        success: () => resolve(),
        error: (err: any) => {
          console.error("[BotAgent] ZoomMtg.init error", err)
          reject(err)
        },
      })
    })

    await new Promise<void>((resolve, reject) => {
      ZoomMtg.join({
        meetingNumber,
        userName: "Audio Capture Bot",
        signature,
        sdkKey,
        passWord: password,
        success: () => {
          console.log("[BotAgent] Joined Zoom meeting as bot")
          resolve()
        },
        error: (err: any) => {
          console.error("[BotAgent] ZoomMtg.join error", err)
          reject(err)
        },
      })
    })
  }

  const startCaptureAndStream = async (docId: string) => {
    // Try to capture audio directly from Zoom audio element to avoid manual system audio sharing
    let stream: MediaStream | null = await tryCaptureZoomAudio()
    if (!stream) {
      // Fallback: system audio share (user prompt). Keep video tiny and ignored.
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 1, width: 1, height: 1 },
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100, channelCount: 1 },
      } as any)
    }

    mediaStreamRef.current = stream
    const audioOnly = new MediaStream(stream.getAudioTracks())

    // PCM float32 capture via Web Audio API for reliable decode on subscribers
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 44100 })
    const source = audioContext.createMediaStreamSource(audioOnly)
    const processor = audioContext.createScriptProcessor(4096, source.channelCount, 1)
    source.connect(processor)
    processor.connect(audioContext.destination)

    processor.onaudioprocess = async (e) => {
      try {
        const input = e.inputBuffer
        const numChannels = Math.min(input.numberOfChannels, 1)
        const samples = input.length
        const interleaved = new Float32Array(samples * numChannels)
        for (let ch = 0; ch < numChannels; ch++) {
          const channel = input.getChannelData(ch)
          for (let i = 0; i < samples; i++) {
            interleaved[i * numChannels + ch] = channel[i]
          }
        }

        const base64 = arrayBufferToBase64(interleaved.buffer)
        await fetch("/api/stream/audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meetingId: docId, audioData: base64, format: "pcm_f32", sampleRate: input.sampleRate, channels: numChannels }),
        })
      } catch (err) {
        console.error("[BotAgent] PCM send error", err)
      }
    }
  }

  const tryCaptureZoomAudio = async (): Promise<MediaStream | null> => {
    // Wait briefly for Zoom DOM to render
    await new Promise((r) => setTimeout(r, 1000))
    const audios = Array.from(document.querySelectorAll("audio")) as HTMLAudioElement[]
    for (const a of audios) {
      try {
        // Ensure the element is playing
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        a.play?.()
        // Some browsers expose captureStream on media elements
        const cap = (a as any).captureStream?.() as MediaStream | undefined
        if (cap && cap.getAudioTracks().length > 0) {
          return new MediaStream(cap.getAudioTracks())
        }
      } catch {}
    }
    return null
  }

  const ensureZoomCss = () => {
    const id = "zoom-sdk-bootstrap-css"
    if (!document.getElementById(id)) {
      const link = document.createElement("link")
      link.id = id
      link.rel = "stylesheet"
      link.href = "https://source.zoom.us/2.17.0/css/bootstrap.css"
      document.head.appendChild(link)
    }
  }

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = ""
    const bytes = new Uint8Array(buffer)
    const chunkSize = 0x8000
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize)
      binary += String.fromCharCode.apply(null, Array.from(chunk) as unknown as number[])
    }
    return btoa(binary)
  }

  const stopStreaming = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop())
      mediaStreamRef.current = null
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="p-6 rounded-md border">
        <h1 className="text-lg font-semibold">Bot Agent</h1>
        <p className="text-sm text-gray-600">Status: {status}</p>
        <p className="text-xs text-gray-500">Meeting Doc: {meetingDocId || "(none)"}</p>
      </div>
    </div>
  )
}


