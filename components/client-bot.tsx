"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Mic, MicOff, Volume2, VolumeX, Activity, Users, Wifi, WifiOff, AlertCircle } from "lucide-react"
import { doc, updateDoc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { ZoomMeeting } from "@/lib/types"

interface ClientBotProps {
  meeting: ZoomMeeting
  onStatusChange: (status: string) => void
}

export function ClientBot({ meeting, onStatusChange }: ClientBotProps) {
  const [isActive, setIsActive] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [subscriberCount, setSubscriberCount] = useState(0)
  const [streamQuality, setStreamQuality] = useState<"excellent" | "good" | "poor" | "disconnected">("disconnected")
  const [error, setError] = useState<string | null>(null)

  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Listen for subscriber connections
    const unsubscribe = onSnapshot(doc(db, "meetings", meeting.id), (doc) => {
      const data = doc.data()
      if (data?.connectedSubscribers) {
        setSubscriberCount(data.connectedSubscribers.length)
      }
    })

    return () => {
      unsubscribe()
      cleanup()
    }
  }, [meeting.id])

  const cleanup = () => {
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current)
      streamingIntervalRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
  }

  const initializeAudioCapture = async () => {
    try {
      setError(null)

      // Request system audio capture explicitly. Some browsers require video:true with display capture
      // but we minimize exposure by not using the video track.
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 1, width: 1, height: 1 },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          channelCount: 2,
        } as MediaTrackConstraints,
      })

      mediaStreamRef.current = stream

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 2048
      analyserRef.current.smoothingTimeConstant = 0.8
      source.connect(analyserRef.current)

      // Only keep the audio tracks to avoid extra overhead
      const audioOnlyStream = new MediaStream(stream.getAudioTracks())

      mediaRecorderRef.current = new MediaRecorder(audioOnlyStream, {
        mimeType: "audio/webm;codecs=opus",
        audioBitsPerSecond: 128000,
      })

      const audioChunks: Blob[] = []

      mediaRecorderRef.current.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data)

          const arrayBuffer = await event.data.arrayBuffer()
          const base64Audio = Buffer.from(arrayBuffer).toString("base64")

          try {
            await fetch("/api/stream/audio", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                meetingId: meeting.id,
                audioData: base64Audio,
              }),
            })
            setStreamQuality("good")
          } catch (error) {
            console.error("[ClientBot] Failed to stream audio:", error)
            setStreamQuality("poor")
          }
        }
      }

      mediaRecorderRef.current.onerror = (event) => {
        console.error("[ClientBot] MediaRecorder error:", event)
        setError("Audio recording failed")
        setStreamQuality("poor")
      }

      // Start audio level monitoring
      monitorAudioLevel()

      return stream
    } catch (error) {
      console.error("[ClientBot] Failed to initialize audio capture:", error)
      setError("Failed to capture screen audio. Please ensure you select 'Share system audio' when prompted.")
      throw error
    }
  }

  const monitorAudioLevel = () => {
    if (!analyserRef.current) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)

    const updateLevel = () => {
      if (!analyserRef.current || !isActive) return

      analyserRef.current.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length
      const level = Math.round((average / 255) * 100)
      setAudioLevel(level)

      // Update connection quality based on audio activity
      if (level > 5) {
        setStreamQuality("excellent")
        setIsConnected(true)
      } else if (level > 1) {
        setStreamQuality("good")
        setIsConnected(true)
      } else {
        setStreamQuality("poor")
      }

      requestAnimationFrame(updateLevel)
    }

    updateLevel()
  }

  const startBot = async () => {
    try {
      setIsActive(true)
      setError(null)
      onStatusChange("starting")

      await initializeAudioCapture()

      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.start(100) // Record in 100ms chunks for low latency
      }

      // Update meeting status in Firebase
      await updateDoc(doc(db, "meetings", meeting.id), {
        botJoined: true,
        status: "live",
        botStartedAt: new Date(),
      })

      setIsConnected(true)
      onStatusChange("active")
      console.log("[ClientBot] Bot started successfully - capturing and streaming audio")
    } catch (error) {
      console.error("[ClientBot] Failed to start bot:", error)
      setIsActive(false)
      setIsConnected(false)
      onStatusChange("error")
      setError(error instanceof Error ? error.message : "Failed to start bot")
    }
  }

  const stopBot = async () => {
    setIsActive(false)
    setIsConnected(false)
    setError(null)

    cleanup()

    // Update meeting status
    await updateDoc(doc(db, "meetings", meeting.id), {
      botJoined: false,
      status: "ended",
      botEndedAt: new Date(),
    })

    onStatusChange("stopped")
    setStreamQuality("disconnected")
    setAudioLevel(0)
    console.log("[ClientBot] Bot stopped")
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Audio Capture Bot
        </CardTitle>
        <CardDescription>
          Captures audio from your Zoom meeting screen and streams it live to assigned subscribers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={isActive ? "default" : "outline"}>{isActive ? "Capturing" : "Inactive"}</Badge>
            <Badge variant={isConnected ? "default" : "outline"}>
              {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isConnected ? "Streaming" : "Offline"}
            </Badge>
          </div>
          <div className="flex gap-2">
            {!isActive ? (
              <Button onClick={startBot} className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Start Audio Capture
              </Button>
            ) : (
              <Button onClick={stopBot} variant="destructive" className="flex items-center gap-2">
                <MicOff className="h-4 w-4" />
                Stop Capture
              </Button>
            )}
          </div>
        </div>

        {isActive && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Audio Level</span>
                <span>{audioLevel}%</span>
              </div>
              <Progress value={audioLevel} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span>Listeners: {subscriberCount}</span>
              </div>
              <div className="flex items-center gap-2">
                {streamQuality === "excellent" && <Volume2 className="h-4 w-4 text-green-500" />}
                {streamQuality === "good" && <Volume2 className="h-4 w-4 text-blue-500" />}
                {streamQuality === "poor" && <Volume2 className="h-4 w-4 text-yellow-500" />}
                {streamQuality === "disconnected" && <VolumeX className="h-4 w-4 text-red-500" />}
                <span className="capitalize">Quality: {streamQuality}</span>
              </div>
            </div>
          </>
        )}

        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Instructions:</strong>
            {!isActive ? (
              <>
                {" "}
                Join your Zoom meeting, then click "Start Audio Capture" and select "Share system audio" when prompted.
              </>
            ) : (
              <>
                {" "}
                Bot is now capturing audio from your screen and streaming it live to {subscriberCount} subscriber(s).
              </>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
