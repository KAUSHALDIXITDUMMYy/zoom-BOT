import { type NextRequest, NextResponse } from "next/server"
import { broadcastAudioData } from "../sse/route"

// Node runtime required for Buffer and streaming
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { meetingId, audioData, format, sampleRate, channels } = await request.json()

    if (!meetingId || !audioData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (format === "pcm_f32") {
      // Pass through with metadata for clients to reconstruct
      broadcastAudioData(meetingId, {
        format: "pcm_f32",
        data: audioData,
        sampleRate: typeof sampleRate === "number" ? sampleRate : 44100,
        channels: typeof channels === "number" ? channels : 1,
      })
    } else {
      // Default/back-compat: treat as webm/opus chunk
      const audioBuffer = Buffer.from(audioData, "base64")
      broadcastAudioData(meetingId, audioBuffer)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Audio API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
