import { type NextRequest, NextResponse } from "next/server"
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

// Ensure Node runtime for Firebase SDK
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event, payload } = body

    console.log("[Zoom Webhook] Received event:", event)

    switch (event) {
      case "meeting.started":
        await handleMeetingStarted(payload)
        break

      case "meeting.ended":
        await handleMeetingEnded(payload)
        break

      case "meeting.participant_joined":
        await handleParticipantJoined(payload)
        break

      case "meeting.participant_left":
        await handleParticipantLeft(payload)
        break

      default:
        console.log("[Zoom Webhook] Unhandled event:", event)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Zoom Webhook] Error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}

async function handleMeetingStarted(payload: any) {
  const meetingId = payload.object.id.toString()

  try {
    // Find meeting in Firebase
    const q = query(collection(db, "meetings"), where("meetingId", "==", meetingId))

    const querySnapshot = await getDocs(q)

    if (!querySnapshot.empty) {
      const meetingDoc = querySnapshot.docs[0]

      // Update meeting status to live and request bot join
      await updateDoc(doc(db, "meetings", meetingDoc.id), {
        status: "live",
        botJoinRequested: true,
      })

      console.log(`[Zoom Webhook] Meeting ${meetingId} started`)

      // Optional: external trigger could hit /api/bot with {action: "join"}
    }
  } catch (error) {
    console.error("[Zoom Webhook] Error handling meeting started:", error)
  }
}

async function handleMeetingEnded(payload: any) {
  const meetingId = payload.object.id.toString()

  try {
    // Find meeting in Firebase
    const q = query(collection(db, "meetings"), where("meetingId", "==", meetingId))

    const querySnapshot = await getDocs(q)

    if (!querySnapshot.empty) {
      const meetingDoc = querySnapshot.docs[0]

      // Update meeting status to ended
      await updateDoc(doc(db, "meetings", meetingDoc.id), {
        status: "ended",
        botJoined: false,
      })

      console.log(`[Zoom Webhook] Meeting ${meetingId} ended`)
    }
  } catch (error) {
    console.error("[Zoom Webhook] Error handling meeting ended:", error)
  }
}

async function handleParticipantJoined(payload: any) {
  const meetingId = payload.object.id.toString()
  const participant = payload.object.participant

  // Check if this is our bot joining
  if (participant.user_name?.includes("Bot") || participant.user_name?.includes("Audio Capture")) {
    try {
      const q = query(collection(db, "meetings"), where("meetingId", "==", meetingId))

      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        const meetingDoc = querySnapshot.docs[0]

        await updateDoc(doc(db, "meetings", meetingDoc.id), {
          botJoined: true,
          audioStreamUrl: `https://stream.example.com/${meetingId}`,
        })

        console.log(`[Zoom Webhook] Bot joined meeting ${meetingId}`)
      }
    } catch (error) {
      console.error("[Zoom Webhook] Error handling bot join:", error)
    }
  }
}

async function handleParticipantLeft(payload: any) {
  const meetingId = payload.object.id.toString()
  const participant = payload.object.participant

  // Check if this is our bot leaving
  if (participant.user_name?.includes("Bot") || participant.user_name?.includes("Audio Capture")) {
    try {
      const q = query(collection(db, "meetings"), where("meetingId", "==", meetingId))

      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        const meetingDoc = querySnapshot.docs[0]

        await updateDoc(doc(db, "meetings", meetingDoc.id), {
          botJoined: false,
          audioStreamUrl: null,
        })

        console.log(`[Zoom Webhook] Bot left meeting ${meetingId}`)
      }
    } catch (error) {
      console.error("[Zoom Webhook] Error handling bot leave:", error)
    }
  }
}
