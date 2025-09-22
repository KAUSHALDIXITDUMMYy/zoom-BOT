"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Video, Calendar, Clock, User, Bot, ExternalLink, Play, Pause } from "lucide-react"
import type { ZoomMeeting } from "@/lib/types"
import { ClientBot } from "./client-bot"
import { AudioPlayer } from "./audio-player"

interface MeetingCardProps {
  meeting: ZoomMeeting
  onStatusUpdate?: (meetingId: string, status: string) => void
  showSubscriberView?: boolean
}

export function MeetingCard({ meeting, onStatusUpdate, showSubscriberView = false }: MeetingCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [botStatus, setBotStatus] = useState("inactive")

  const getStatusColor = (status: string) => {
    switch (status) {
      case "live":
        return "bg-green-500"
      case "scheduled":
        return "bg-blue-500"
      case "ended":
        return "bg-gray-500"
      default:
        return "bg-gray-500"
    }
  }

  const formatDateTime = (date: Date) => {
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
  }

  const { date, time } = formatDateTime(meeting.startTime)

  const handleStreamToggle = async () => {
    try {
      const subscriberId = localStorage.getItem("subscriber")
        ? JSON.parse(localStorage.getItem("subscriber")!).id
        : null

      if (!subscriberId) return

      const response = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriberId,
          meetingId: meeting.id,
          action: isStreaming ? "stop" : "start",
        }),
      })

      if (response.ok) {
        setIsStreaming(!isStreaming)
      }
    } catch (error) {
      console.error("Failed to toggle stream:", error)
    }
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Video className="h-5 w-5 text-blue-600" />
              {meeting.topic}
            </CardTitle>
            <CardDescription className="mt-1">
              {showSubscriberView
                ? "Your assigned meeting"
                : `Assigned to ${(meeting as any).assignedSubscriberNames?.join(", ") || (meeting as any).assignedSubscriberName || "—"}`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${getStatusColor(meeting.status)} text-white border-0`}>
              {meeting.status}
            </Badge>
            {meeting.botJoined && (
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                <Bot className="h-3 w-3 mr-1" />
                Bot Active
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>{date}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="h-4 w-4" />
            <span>
              {time} ({meeting.duration} min)
            </span>
          </div>
          {!showSubscriberView && (
            <div className="flex items-center gap-2 text-gray-600 col-span-2">
              <User className="h-4 w-4" />
              <span>{meeting.assignedSubscriberName}</span>
            </div>
          )}
        </div>

        {!showSubscriberView && meeting.status === "live" && (
          <ClientBot meeting={meeting} onStatusChange={setBotStatus} />
        )}

        {showSubscriberView && meeting.status === "live" && meeting.botJoined && <AudioPlayer meetingId={meeting.id} />}

        <div className="flex items-center gap-2 pt-2">
          {showSubscriberView ? (
            <>
              {meeting.status === "live" && meeting.botJoined && (
                <Button
                  onClick={handleStreamToggle}
                  className={`flex items-center gap-2 ${
                    isStreaming ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {isStreaming ? (
                    <>
                      <Pause className="h-4 w-4" />
                      Stop Listening
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Start Listening
                    </>
                  )}
                </Button>
              )}
              {meeting.status === "scheduled" && (
                <Button disabled variant="outline">
                  Meeting Not Started
                </Button>
              )}
              {meeting.status === "live" && !meeting.botJoined && (
                <Button disabled variant="outline">
                  Waiting for Bot to Join
                </Button>
              )}
              {meeting.status === "ended" && meeting.audioStreamUrl && (
                <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                  <Play className="h-4 w-4" />
                  Play Recording
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => window.open(meeting.meetingUrl, "_blank")}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Join Meeting
              </Button>
              <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{meeting.topic}</DialogTitle>
                    <DialogDescription>Meeting Details and Bot Status</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-sm">Meeting ID</h4>
                        <p className="text-sm text-gray-600">{meeting.meetingId}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">Status</h4>
                        <Badge className={`${getStatusColor(meeting.status)} text-white border-0`}>
                          {meeting.status}
                        </Badge>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">Start Time</h4>
                        <p className="text-sm text-gray-600">
                          {date} at {time}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">Duration</h4>
                        <p className="text-sm text-gray-600">{meeting.duration} minutes</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">Assigned To</h4>
                        <p className="text-sm text-gray-600">{meeting.assignedSubscriberName}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">Bot Status</h4>
                        <Badge variant={meeting.botJoined ? "default" : "outline"}>
                          {meeting.botJoined ? "Active" : "Pending"}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Meeting URL</h4>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={meeting.meetingUrl}
                          readOnly
                          className="flex-1 px-3 py-2 text-sm border rounded-md bg-gray-50"
                        />
                        <Button size="sm" onClick={() => navigator.clipboard.writeText(meeting.meetingUrl)}>
                          Copy
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
