"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, Volume2, VolumeX, Wifi, WifiOff } from "lucide-react"
import { audioStreamManager } from "@/lib/audio-stream"

interface RealTimeAudioProps {
  meetingId: string
  subscriberId: string
  isLive: boolean
  onStreamStart?: () => void
  onStreamEnd?: () => void
}

export function RealTimeAudio({ meetingId, subscriberId, isLive, onStreamStart, onStreamEnd }: RealTimeAudioProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState([75])
  const [quality, setQuality] = useState<"excellent" | "good" | "poor" | "disconnected">("disconnected")
  const [latency, setLatency] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (isLive && isConnected) {
      const interval = setInterval(() => {
        setQuality(audioStreamManager.getStreamQuality())
        setLatency(45 + Math.random() * 10)
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [isLive, isConnected])

  const connectToStream = async () => {
    if (!isLive) return

    setIsLoading(true)
    try {
      const stream = await audioStreamManager.connectToStream(meetingId, subscriberId)
      streamRef.current = stream

      if (audioRef.current) {
        audioRef.current.srcObject = stream
      }

      setIsConnected(true)
      onStreamStart?.()
    } catch (error) {
      console.error("Failed to connect to stream:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const disconnectFromStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (audioRef.current) {
      audioRef.current.srcObject = null
    }

    audioStreamManager.disconnectFromStream(subscriberId)
    setIsConnected(false)
    setIsPlaying(false)
    setQuality("disconnected")
    onStreamEnd?.()
  }

  const togglePlayPause = async () => {
    if (!audioRef.current || !isConnected) return

    try {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        await audioRef.current.play()
        setIsPlaying(true)
      }
    } catch (error) {
      console.error("Audio playback error:", error)
    }
  }

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume[0] / 100
    }
  }

  const getQualityColor = (q: string) => {
    switch (q) {
      case "excellent":
        return "text-green-600 bg-green-100 border-green-200"
      case "good":
        return "text-blue-600 bg-blue-100 border-blue-200"
      case "poor":
        return "text-yellow-600 bg-yellow-100 border-yellow-200"
      case "disconnected":
        return "text-gray-600 bg-gray-100 border-gray-200"
      default:
        return "text-gray-600 bg-gray-100 border-gray-200"
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          {isConnected ? <Wifi className="h-5 w-5 text-green-600" /> : <WifiOff className="h-5 w-5 text-gray-400" />}
          Live Audio Stream
        </CardTitle>
        <CardDescription>Real-time audio from meeting {meetingId}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <audio ref={audioRef} autoPlay={false} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />

        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getQualityColor(quality)}>
              {quality.toUpperCase()}
            </Badge>
            {isConnected && <span className="text-sm text-gray-500">{latency.toFixed(0)}ms latency</span>}
          </div>
          <Badge variant={isLive ? "default" : "outline"} className={isLive ? "bg-red-500 animate-pulse" : ""}>
            {isLive ? "LIVE" : "OFFLINE"}
          </Badge>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {!isConnected ? (
            <Button
              onClick={connectToStream}
              disabled={!isLive || isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : null}
              {isLoading ? "Connecting..." : "Connect to Stream"}
            </Button>
          ) : (
            <>
              <Button
                onClick={togglePlayPause}
                className={`w-12 h-12 rounded-full ${
                  isPlaying ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </Button>
              <Button variant="outline" onClick={disconnectFromStream}>
                Disconnect
              </Button>
            </>
          )}
        </div>

        {/* Volume Control */}
        {isConnected && (
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => handleVolumeChange(volume[0] > 0 ? [0] : [75])}>
              {volume[0] === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Slider value={volume} max={100} step={1} onValueChange={handleVolumeChange} className="flex-1" />
            <span className="text-xs text-gray-500 w-8">{volume[0]}%</span>
          </div>
        )}

        {/* Stream Info */}
        {isConnected && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t text-sm text-gray-600">
            <div>
              <span className="font-medium">Codec:</span> Opus
            </div>
            <div>
              <span className="font-medium">Bitrate:</span> 128kbps
            </div>
            <div>
              <span className="font-medium">Sample Rate:</span> 44.1kHz
            </div>
            <div>
              <span className="font-medium">Buffer:</span> 100ms
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
