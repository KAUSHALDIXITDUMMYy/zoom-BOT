import { NextResponse } from "next/server"
import crypto from "crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const { meetingNumber, role, sdkKey } = await request.json()
    const key = sdkKey || process.env.ZOOM_MEETING_SDK_KEY || ""
    const secret = process.env.ZOOM_MEETING_SDK_SECRET || ""

    if (!key || !secret || !meetingNumber) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    const iat = Math.round(Date.now() / 1000) - 30
    const exp = iat + 60 * 5
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")
    const payload = Buffer.from(
      JSON.stringify({
        sdkKey: key,
        mn: meetingNumber,
        role: typeof role === "number" ? role : 0,
        iat,
        exp,
        appKey: key,
        tokenExp: exp,
      }),
    ).toString("base64url")

    const signature = crypto
      .createHmac("sha256", secret)
      .update(`${header}.${payload}`)
      .digest("base64url")

    const jwt = `${header}.${payload}.${signature}`
    return NextResponse.json({ signature: jwt, sdkKey: key })
  } catch (e) {
    return NextResponse.json({ error: "Failed to create signature" }, { status: 500 })
  }
}


