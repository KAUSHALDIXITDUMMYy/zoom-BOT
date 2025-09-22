export interface Subscriber {
  id: string
  name: string
  email: string
  createdAt: Date
  isActive: boolean
}

export interface ZoomMeeting {
  id: string
  meetingId: string
  meetingUrl: string
  topic: string
  startTime: Date
  duration: number
  assignedSubscriberIds: string[]
  assignedSubscriberNames: string[]
  status: "scheduled" | "live" | "ended"
  createdAt: Date
  botJoined: boolean
  audioStreamUrl?: string
}

export interface AudioStream {
  id: string
  meetingId: string
  subscriberId: string
  streamUrl: string
  isActive: boolean
  createdAt: Date
}

export interface User {
  id: string
  email: string
  password: string
  role: "admin" | "subscriber"
  name: string
  createdAt: Date
  isActive: boolean
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}
