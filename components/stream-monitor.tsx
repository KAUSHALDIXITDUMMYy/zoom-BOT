"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Activity, Wifi, Users, Volume2, Zap } from "lucide-react"

interface StreamMonitorProps {
  meetingId: string
  isActive: boolean
}

export function StreamMonitor({ meetingId, isActive }: StreamMonitorProps) {
  const [metrics, setMetrics] = useState({
    latency: 0,
    bitrate: 0,
    packetLoss: 0,
    activeListeners: 0,
    audioLevel: 0,
    uptime: "00:00:00",
  })

  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(() => {
      // Simulate real-time metrics
      setMetrics((prev) => ({
        latency: 45 + Math.random() * 10,
        bitrate: 128 + Math.random() * 20,
        packetLoss: Math.random() * 2,
        activeListeners: Math.floor(Math.random() * 5) + 1,
        audioLevel: Math.random() * 100,
        uptime: formatUptime(Date.now() - (Date.now() % 1000000)),
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive])

  const formatUptime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000) % 60
    const minutes = Math.floor(ms / 60000) % 60
    const hours = Math.floor(ms / 3600000)
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  const getQualityColor = (value: number, thresholds: { good: number; poor: number }) => {
    if (value <= thresholds.good) return "text-green-600"
    if (value <= thresholds.poor) return "text-yellow-600"
    return "text-red-600"
  }

  if (!isActive) {
    return (
      <Card className="w-full opacity-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-gray-400" />
            Stream Monitor
          </CardTitle>
          <CardDescription>Stream is not active</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">No active stream to monitor</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-green-600" />
          Stream Monitor
          <Badge className="bg-green-100 text-green-800 border-green-200">LIVE</Badge>
        </CardTitle>
        <CardDescription>Real-time streaming metrics for meeting {meetingId}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Latency</span>
            </div>
            <div className={`text-lg font-bold ${getQualityColor(metrics.latency, { good: 50, poor: 100 })}`}>
              {metrics.latency.toFixed(0)}ms
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Wifi className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Bitrate</span>
            </div>
            <div className="text-lg font-bold text-purple-600">{metrics.bitrate.toFixed(0)}kbps</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">Listeners</span>
            </div>
            <div className="text-lg font-bold text-orange-600">{metrics.activeListeners}</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Volume2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Audio</span>
            </div>
            <div className="text-lg font-bold text-green-600">{metrics.audioLevel.toFixed(0)}%</div>
          </div>
        </div>

        {/* Audio Level Visualization */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Audio Level</span>
            <span className="text-gray-500">{metrics.audioLevel.toFixed(0)}%</span>
          </div>
          <Progress value={metrics.audioLevel} className="h-2" />
        </div>

        {/* Packet Loss */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Packet Loss</span>
            <span className={getQualityColor(metrics.packetLoss, { good: 1, poor: 3 })}>
              {metrics.packetLoss.toFixed(2)}%
            </span>
          </div>
          <Progress value={metrics.packetLoss} max={5} className="h-2" />
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t text-sm text-gray-600">
          <div>
            <span className="font-medium">Uptime:</span> {metrics.uptime}
          </div>
          <div>
            <span className="font-medium">Codec:</span> Opus
          </div>
          <div>
            <span className="font-medium">Sample Rate:</span> 44.1kHz
          </div>
          <div>
            <span className="font-medium">Channels:</span> Stereo
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Bot Connected
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Audio Streaming
          </Badge>
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            High Quality
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
