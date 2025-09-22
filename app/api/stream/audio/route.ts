import { type NextRequest, NextResponse } from "next/server"
import { broadcastAudioData } from "../sse/route"

// Node runtime required for Buffer and streaming
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { meetingId, audioData } = await request.json()

    if (!meetingId || !audioData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Convert base64 audio data back to ArrayBuffer
    const audioBuffer = Buffer.from(audioData, "base64")

    // Broadcast to all connected subscribers
    broadcastAudioData(meetingId, audioBuffer)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Audio API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
