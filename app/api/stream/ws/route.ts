import type { NextRequest } from "next/server"

// This endpoint is deprecated in favor of SSE-based streaming.
// Keep it returning 410 Gone to avoid confusion.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  return new Response(
    JSON.stringify({
      error: "WebSocket streaming is deprecated. Use /api/stream/sse instead.",
    }),
    { status: 410, headers: { "Content-Type": "application/json" } },
  )
}
