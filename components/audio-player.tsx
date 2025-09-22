"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, Volume2, VolumeX, Wifi, WifiOff, Activity } from "lucide-react"

interface AudioPlayerProps {
  meetingId: string
  meetingTopic?: string
  isLive?: boolean
  onStreamEnd?: () => void
}

export function AudioPlayer({ meetingId, meetingTopic, isLive = true, onStreamEnd }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState([75])
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [quality, setQuality] = useState<"excellent" | "good" | "poor" | "disconnected">("disconnected")
  const [latency, setLatency] = useState(0)
  const [bitrate, setBitrate] = useState(0)

  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const audioQueueRef = useRef<AudioBuffer[]>([])
  const isPlayingAudioRef = useRef(false)

  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

  const cleanup = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
  }

  const connectToStream = async () => {
    try {
      setIsLoading(true)
      setIsConnected(false)

      const subscriberData = localStorage.getItem("currentUser")
      if (!subscriberData) {
        throw new Error("Subscriber not authenticated")
      }

      const subscriber = JSON.parse(subscriberData)

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      gainNodeRef.current = audioContextRef.current.createGain()
      gainNodeRef.current.connect(audioContextRef.current.destination)
      gainNodeRef.current.gain.value = volume[0] / 100

      const sseUrl = `/api/stream/sse?meetingId=${meetingId}&subscriberId=${subscriber.id}`
      eventSourceRef.current = new EventSource(sseUrl)

      eventSourceRef.current.onopen = () => {
        console.log("[AudioPlayer] Connected to audio stream")
        setIsConnected(true)
        setIsPlaying(true)
        setQuality("good")
      }

      eventSourceRef.current.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === "audio" && data.data) {
            const audioData = Uint8Array.from(atob(data.data), (c) => c.charCodeAt(0))
            const audioBuffer = await audioContextRef.current!.decodeAudioData(audioData.buffer.slice())

            // Add to queue and play
            audioQueueRef.current.push(audioBuffer)
            if (!isPlayingAudioRef.current) {
              playNextAudio()
            }

            // Update metrics
            setBitrate(Math.round((audioData.length * 8) / 100)) // Approximate bitrate
            setLatency(Date.now() - data.timestamp)
            setQuality("excellent")
          } else if (data.type === "status") {
            if (!data.botJoined) {
              setQuality("poor")
            }
          }
        } catch (error) {
          console.error("[AudioPlayer] Error processing audio:", error)
          setQuality("poor")
        }
      }

      eventSourceRef.current.onerror = (error) => {
        console.error("[AudioPlayer] SSE error:", error)
        setQuality("poor")
        setIsConnected(false)
      }

      eventSourceRef.current.onclose = () => {
        console.log("[AudioPlayer] Stream closed")
        setIsConnected(false)
        setIsPlaying(false)
        setQuality("disconnected")
      }
    } catch (error) {
      console.error("[AudioPlayer] Failed to connect:", error)
      setQuality("disconnected")
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }

  const playNextAudio = () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingAudioRef.current = false
      return
    }

    isPlayingAudioRef.current = true
    const audioBuffer = audioQueueRef.current.shift()!

    const source = audioContextRef.current!.createBufferSource()
    source.buffer = audioBuffer
    source.connect(gainNodeRef.current!)

    source.onended = () => {
      playNextAudio() // Play next audio in queue
    }

    source.start()
  }

  const disconnectFromStream = () => {
    cleanup()
    setIsConnected(false)
    setIsPlaying(false)
    setQuality("disconnected")
    audioQueueRef.current = []
    isPlayingAudioRef.current = false
    onStreamEnd?.()
  }

  const togglePlayPause = async () => {
    if (!isConnected && !isPlaying) {
      await connectToStream()
    } else if (isConnected && isPlaying) {
      disconnectFromStream()
    }
  }

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume)
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newVolume[0] / 100
    }
  }

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case "excellent":
        return "text-green-600 border-green-600"
      case "good":
        return "text-blue-600 border-blue-600"
      case "poor":
        return "text-yellow-600 border-yellow-600"
      case "disconnected":
        return "text-red-600 border-red-600"
      default:
        return "text-gray-600 border-gray-600"
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Live Audio Stream
            </CardTitle>
            <CardDescription>{meetingTopic ? `Meeting: ${meetingTopic}` : `Meeting ID: ${meetingId}`}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isLive && isConnected && <Badge className="bg-red-500 text-white animate-pulse">LIVE</Badge>}
            <Badge variant="outline" className={getQualityColor(quality)}>
              {quality.toUpperCase()}
            </Badge>
            {isConnected ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="font-semibold text-lg">{latency}ms</div>
            <div className="text-gray-500">Latency</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-lg">{bitrate}kbps</div>
            <div className="text-gray-500">Bitrate</div>
          </div>
          <div className="text-center">
            <div className={`font-semibold text-lg ${isConnected ? "text-green-600" : "text-red-600"}`}>
              {isConnected ? "LIVE" : "OFFLINE"}
            </div>
            <div className="text-gray-500">Status</div>
          </div>
        </div>

        {/* Main Control */}
        <div className="flex items-center justify-center">
          <Button
            onClick={togglePlayPause}
            disabled={isLoading}
            className={`w-16 h-16 rounded-full ${
              isPlaying ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6 ml-0.5" />
            )}
          </Button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => handleVolumeChange(volume[0] > 0 ? [0] : [75])}>
            {volume[0] === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Slider value={volume} max={100} step={1} onValueChange={handleVolumeChange} className="flex-1" />
          <span className="text-xs text-gray-500 w-8">{volume[0]}%</span>
        </div>

        {/* Stream Info */}
        {isConnected && (
          <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300 text-sm">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span>Receiving live audio stream from meeting</span>
            </div>
          </div>
        )}

        {!isConnected && !isLoading && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
            <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
              Click play to connect to the live audio stream
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
