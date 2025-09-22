"use client"

import { useEffect, useRef, useState } from "react"
import { onSnapshot, doc, updateDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useSearchParams } from "next/navigation"

// Lightweight bot agent page: auto-joins Zoom via Meeting SDK when requested and relays audio to SSE
export default function BotAgentPage() {
  const search = useSearchParams()
  const meetingDocId = search.get("meetingId") // Firestore document id
  const [status, setStatus] = useState("idle")
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (!meetingDocId) return

    // Watch the meeting document for botJoinRequested
    const unsubscribe = onSnapshot(doc(db, "meetings", meetingDocId), async (snap) => {
      const data = snap.data() as any
      if (!data) return

      if (data.botJoinRequested && status !== "streaming") {
        setStatus("joining")
        try {
          // Join the Zoom meeting via Meeting SDK (attendee role) then start capture and streaming
          await joinZoomMeeting(meetingDocId)
          await startCaptureAndStream(meetingDocId)
          await updateDoc(doc(db, "meetings", meetingDocId), { botJoined: true, status: "live" })
          setStatus("streaming")
        } catch (e) {
          console.error("[BotAgent] Failed to start streaming", e)
          setStatus("error")
        }
      }

      if (!data.botJoinRequested && status === "streaming") {
        stopStreaming()
        setStatus("idle")
      }
    })

    return () => {
      unsubscribe()
      stopStreaming()
    }
  }, [meetingDocId, status])

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
    // Configure SDK static assets
    ZoomMtg.setZoomJSLib("https://source.zoom.us/2.17.0/lib", "/av")
    ZoomMtg.preLoadWasm()
    ZoomMtg.prepareJssdk()

    await new Promise<void>((resolve, reject) => {
      ZoomMtg.init({
        leaveUrl: window.location.origin + "/bot?meetingId=" + docId,
        disableInvite: true,
        disableCallOut: true,
        success: () => resolve(),
        error: (err: any) => reject(err),
      })
    })

    await new Promise<void>((resolve, reject) => {
      ZoomMtg.join({
        meetingNumber,
        userName: "Audio Capture Bot",
        signature,
        sdkKey,
        passWord: password,
        success: () => resolve(),
        error: (err: any) => reject(err),
      })
    })
  }

  const startCaptureAndStream = async (docId: string) => {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 1, width: 1, height: 1 },
      audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100, channelCount: 2 },
    } as any)

    mediaStreamRef.current = stream
    const audioOnly = new MediaStream(stream.getAudioTracks())
    mediaRecorderRef.current = new MediaRecorder(audioOnly, { mimeType: "audio/webm;codecs=opus", audioBitsPerSecond: 128000 })

    mediaRecorderRef.current.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        const arrayBuffer = await event.data.arrayBuffer()
        const base64Audio = Buffer.from(arrayBuffer).toString("base64")
        try {
          await fetch("/api/stream/audio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ meetingId: docId, audioData: base64Audio }),
          })
        } catch (err) {
          console.error("[BotAgent] stream error", err)
        }
      }
    }

    mediaRecorderRef.current.start(100)
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


