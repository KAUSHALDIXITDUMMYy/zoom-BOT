"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bot, Activity, Wifi, WifiOff, Volume2, VolumeX } from "lucide-react"

interface BotStatusProps {
  meetingId: string
  isActive: boolean
  audioQuality?: "excellent" | "good" | "poor" | "disconnected"
  onToggleBot?: (meetingId: string, active: boolean) => void
}

export function BotStatus({ meetingId, isActive, audioQuality = "disconnected", onToggleBot }: BotStatusProps) {
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "connecting" | "disconnected">("disconnected")
  const [audioLevel, setAudioLevel] = useState(0)

  useEffect(() => {
    if (isActive) {
      setConnectionStatus("connecting")
      // Simulate connection process
      const timer = setTimeout(() => {
        setConnectionStatus("connected")
      }, 2000)
      return () => clearTimeout(timer)
    } else {
      setConnectionStatus("disconnected")
    }
  }, [isActive])

  useEffect(() => {
    // Simulate audio level monitoring
    if (connectionStatus === "connected") {
      const interval = setInterval(() => {
        setAudioLevel(Math.random() * 100)
      }, 500)
      return () => clearInterval(interval)
    }
  }, [connectionStatus])

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case "excellent":
        return "text-green-600 bg-green-100"
      case "good":
        return "text-blue-600 bg-blue-100"
      case "poor":
        return "text-yellow-600 bg-yellow-100"
      case "disconnected":
        return "text-gray-600 bg-gray-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return <Wifi className="h-4 w-4 text-green-600" />
      case "connecting":
        return <Activity className="h-4 w-4 text-yellow-600 animate-pulse" />
      case "disconnected":
        return <WifiOff className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-600" />
          Bot Status
        </CardTitle>
        <CardDescription>Audio capture bot for meeting {meetingId}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getConnectionIcon()}
            <span className="text-sm font-medium capitalize">{connectionStatus}</span>
          </div>
          <Badge
            variant="outline"
            className={`${isActive ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-800 border-gray-200"}`}
          >
            {isActive ? "Active" : "Inactive"}
          </Badge>
        </div>

        {connectionStatus === "connected" && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Audio Quality</span>
                <Badge variant="outline" className={getQualityColor(audioQuality)}>
                  {audioQuality}
                </Badge>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>Audio Level</span>
                  {audioLevel > 10 ? (
                    <Volume2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
              <div>
                <span className="font-medium">Latency:</span> 45ms
              </div>
              <div>
                <span className="font-medium">Bitrate:</span> 128kbps
              </div>
              <div>
                <span className="font-medium">Uptime:</span> 00:15:32
              </div>
              <div>
                <span className="font-medium">Packets:</span> 1,247
              </div>
            </div>
          </>
        )}

        {onToggleBot && (
          <Button
            onClick={() => onToggleBot(meetingId, !isActive)}
            className={`w-full ${isActive ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
          >
            {isActive ? "Stop Bot" : "Start Bot"}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
