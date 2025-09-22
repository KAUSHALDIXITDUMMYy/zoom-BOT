import { type NextRequest, NextResponse } from "next/server"
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore"
import { db } from "@/lib/firebase"

// Store active WebSocket connections
const connections = new Map<string, Set<WebSocket>>()

// Ensure this route is always dynamic and runs on the Node.js runtime (required for Firebase + Buffer)
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subscriberId = searchParams.get("subscriberId")
    const meetingId = searchParams.get("meetingId")

    if (!subscriberId) {
      return NextResponse.json({ error: "Subscriber ID required" }, { status: 400 })
    }

    // Get meetings assigned to this subscriber (support both legacy single id and new array)
    const qArray = query(
      collection(db, "meetings"),
      where("assignedSubscriberIds", "array-contains", subscriberId),
      ...(meetingId ? [where("meetingId", "==", meetingId)] : []),
    )

    const qSingle = query(
      collection(db, "meetings"),
      where("assignedSubscriberId", "==", subscriberId),
      ...(meetingId ? [where("meetingId", "==", meetingId)] : []),
    )

    const [snapArray, snapSingle] = await Promise.all([getDocs(qArray), getDocs(qSingle)])
    const seen = new Set<string>()
    const meetings: any[] = []

    const pushDoc = (d: any) => {
      if (seen.has(d.id)) return
      seen.add(d.id)
      const data = d.data()
      meetings.push({
        id: d.id,
        ...data,
        startTime: data.startTime.toDate(),
        createdAt: data.createdAt.toDate(),
      })
    }

    snapArray.forEach(pushDoc)
    snapSingle.forEach(pushDoc)

    // Filter for active meetings with bot joined
    const activeStreams = meetings.filter((meeting) => meeting.status === "live" && meeting.botJoined)

    return NextResponse.json({
      success: true,
      streams: activeStreams.map((meeting) => ({
        meetingId: meeting.meetingId,
        topic: meeting.topic,
        // Use SSE endpoint for audio-only streaming
        streamUrl: `${process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://" + request.headers.get("host")}/api/stream/sse?meetingId=${meeting.id}&subscriberId=${subscriberId}`,
        quality: "good",
        isActive: true,
      })),
    })
  } catch (error) {
    console.error("Stream API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { subscriberId, meetingId, action } = await request.json()

    if (!subscriberId || !meetingId || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Handle stream start/stop for subscriber
    const isStarting = action === "start"

    if (isStarting) {
      await updateDoc(doc(db, "meetings", meetingId), {
        connectedSubscribers: arrayUnion(subscriberId),
      })
    } else {
      await updateDoc(doc(db, "meetings", meetingId), {
        connectedSubscribers: arrayRemove(subscriberId),
      })
    }

    return NextResponse.json({
      success: true,
      action: action,
      // Return SSE URL for clients
      streamUrl: isStarting
        ? `${process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://" + request.headers.get("host")}/api/stream/sse?meetingId=${meetingId}&subscriberId=${subscriberId}`
        : null,
      message: `Stream ${isStarting ? "started" : "stopped"} successfully`,
    })
  } catch (error) {
    console.error("Stream control API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
