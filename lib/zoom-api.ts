const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID || ""
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID || ""
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET || ""

export interface ZoomMeetingData {
  topic: string
  type: number
  start_time: string
  duration: number
  timezone: string
  settings: {
    host_video: boolean
    participant_video: boolean
    join_before_host: boolean
    mute_upon_entry: boolean
    waiting_room: boolean
    audio: string
  }
}

export async function getZoomAccessToken(): Promise<string> {
  if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
    throw new Error("Missing Zoom credentials. Set ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET.")
  }
  const credentials = btoa(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`)

  const response = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "account_credentials",
      account_id: ZOOM_ACCOUNT_ID,
    }),
  })

  if (!response.ok) {
    throw new Error("Failed to get Zoom access token")
  }

  const data = await response.json()
  return data.access_token
}

export async function createZoomMeeting(meetingData: ZoomMeetingData): Promise<any> {
  const accessToken = await getZoomAccessToken()

  const response = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(meetingData),
  })

  if (!response.ok) {
    throw new Error("Failed to create Zoom meeting")
  }

  return response.json()
}

export async function getMeetingDetails(meetingId: string): Promise<any> {
  const accessToken = await getZoomAccessToken()

  const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error("Failed to get meeting details")
  }

  return response.json()
}
