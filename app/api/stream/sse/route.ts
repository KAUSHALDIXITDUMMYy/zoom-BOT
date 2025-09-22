import type { NextRequest } from "next/server"
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore"
import { db } from "@/lib/firebase"

// Store active SSE connections for each meeting
const activeConnections = new Map<string, Set<ReadableStreamDefaultController>>()

// Ensure Node.js runtime for Buffer usage and force dynamic for streaming
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const meetingId = searchParams.get("meetingId")
  const subscriberId = searchParams.get("subscriberId")

  if (!meetingId || !subscriberId) {
    return new Response("Missing required parameters", { status: 400 })
  }

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      console.log(`[SSE] Subscriber ${subscriberId} connected to meeting ${meetingId}`)

      // Add connection to active connections
      if (!activeConnections.has(meetingId)) {
        activeConnections.set(meetingId, new Set())
      }
      activeConnections.get(meetingId)!.add(controller)

      // Update Firebase with connected subscriber
      updateDoc(doc(db, "meetings", meetingId), {
        connectedSubscribers: arrayUnion(subscriberId),
      }).catch(console.error)

      // Send initial connection message
      const data = JSON.stringify({
        type: "connected",
        meetingId,
        subscriberId,
        timestamp: Date.now(),
      })
      controller.enqueue(`data: ${data}\n\n`)

      // Listen for meeting status changes
      const unsubscribe = onSnapshot(doc(db, "meetings", meetingId), (doc) => {
        const meetingData = doc.data()
        if (meetingData) {
          const statusData = JSON.stringify({
            type: "status",
            status: meetingData.status,
            botJoined: meetingData.botJoined,
            timestamp: Date.now(),
          })
          controller.enqueue(`data: ${statusData}\n\n`)
        }
      })

      // Heartbeat every 15s to keep the connection alive on Vercel edge/network layers
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(`: heartbeat\n\n`)
        } catch (error) {
          // If enqueue fails, the connection is likely closed; cleanup follows in abort
          clearInterval(heartbeat)
        }
      }, 15000)

      // Handle connection close
      request.signal.addEventListener("abort", () => {
        console.log(`[SSE] Subscriber ${subscriberId} disconnected from meeting ${meetingId}`)
        unsubscribe()
        clearInterval(heartbeat)

        // Remove from active connections
        const connections = activeConnections.get(meetingId)
        if (connections) {
          connections.delete(controller)
          if (connections.size === 0) {
            activeConnections.delete(meetingId)
          }
        }

        // Update Firebase
        updateDoc(doc(db, "meetings", meetingId), {
          connectedSubscribers: arrayRemove(subscriberId),
        }).catch(console.error)

        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  })
}

// Function to broadcast audio data to all subscribers of a meeting
export function broadcastAudioData(meetingId: string, audioData: ArrayBuffer) {
  const connections = activeConnections.get(meetingId)
  if (!connections || connections.size === 0) return

  const base64Audio = Buffer.from(audioData).toString("base64")
  const data = JSON.stringify({
    type: "audio",
    data: base64Audio,
    timestamp: Date.now(),
  })

  connections.forEach((controller) => {
    try {
      controller.enqueue(`data: ${data}\n\n`)
    } catch (error) {
      console.error("[SSE] Error sending audio data:", error)
      connections.delete(controller)
    }
  })
}
