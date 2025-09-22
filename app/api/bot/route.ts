import { type NextRequest, NextResponse } from "next/server"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { meetingId, action } = await request.json()

    if (!meetingId || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Simulate bot joining/leaving meeting
    const botJoined = action === "join"

    // Update meeting status in Firebase
    await updateDoc(doc(db, "meetings", meetingId), {
      botJoined,
      audioStreamUrl: botJoined ? `https://stream.example.com/${meetingId}` : null,
    })

    // Signal bot agent page to auto-join
    await updateDoc(doc(db, "meetings", meetingId), {
      botJoinRequested: botJoined,
    })

    return NextResponse.json({
      success: true,
      botJoined,
      message: `Bot ${botJoined ? "joined" : "left"} meeting successfully`,
    })
  } catch (error) {
    console.error("Bot API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const meetingId = searchParams.get("meetingId")

    if (!meetingId) {
      return NextResponse.json({ error: "Meeting ID required" }, { status: 400 })
    }

    // Return bot status for the meeting
    // In a real implementation, this would check actual bot status
    return NextResponse.json({
      meetingId,
      isActive: true,
      audioQuality: "good",
      connectionStatus: "connected",
      uptime: "00:15:32",
      audioLevel: 75,
    })
  } catch (error) {
    console.error("Bot status API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
