"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Headphones, Clock, Calendar } from "lucide-react"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { ZoomMeeting, User } from "@/lib/types"
import { MeetingCard } from "@/components/meeting-card"
import { useToast } from "@/hooks/use-toast"
import { Navigation } from "@/components/navigation"

export default function SubscriberPortal() {
  const [subscriber, setSubscriber] = useState<User | null>(null)
  const [meetings, setMeetings] = useState<ZoomMeeting[]>([])
  const [activeMeetings, setActiveMeetings] = useState<ZoomMeeting[]>([])
  const [loading, setLoading] = useState(false)
  const [subscriberEmail, setSubscriberEmail] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Use general user auth, but ensure role is subscriber
    const savedUser = localStorage.getItem("currentUser")
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser) as User
      if (parsedUser.role === "subscriber") {
        setSubscriber(parsedUser)
        setIsAuthenticated(true)
        loadSubscriberMeetings(parsedUser.id)
      }
    }
  }, [])

  const authenticateSubscriber = async () => {
    if (!subscriberEmail) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Find user by email in users with subscriber role
      const q = query(collection(db, "users"), where("email", "==", subscriberEmail), where("role", "==", "subscriber"), where("isActive", "==", true))

      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        toast({
          title: "Error",
          description: "Subscriber not found or inactive",
          variant: "destructive",
        })
        return
      }

      const subscriberDoc = querySnapshot.docs[0]
      const subscriberData = {
        id: subscriberDoc.id,
        ...subscriberDoc.data(),
        createdAt: subscriberDoc.data().createdAt.toDate(),
      } as User

      setSubscriber(subscriberData)
      setIsAuthenticated(true)
      localStorage.setItem("currentUser", JSON.stringify(subscriberData))

      await loadSubscriberMeetings(subscriberData.id)

      toast({
        title: "Success",
        description: "Welcome! Loading your assigned meetings...",
      })
    } catch (error) {
      console.error("Authentication error:", error)
      toast({
        title: "Error",
        description: "Failed to authenticate. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadSubscriberMeetings = async (subscriberId: string) => {
    try {
      const q = query(
        collection(db, "meetings"),
        where("assignedSubscriberIds", "array-contains", subscriberId),
        orderBy("startTime", "desc"),
      )

      const querySnapshot = await getDocs(q)
      const meetingsList: ZoomMeeting[] = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        meetingsList.push({
          id: doc.id,
          ...data,
          startTime: data.startTime.toDate(),
          createdAt: data.createdAt.toDate(),
        } as ZoomMeeting)
      })

      setMeetings(meetingsList)
      setActiveMeetings(meetingsList.filter((m) => m.status === "live"))
    } catch (error) {
      console.error("Error loading meetings:", error)
      toast({
        title: "Error",
        description: "Failed to load meetings",
        variant: "destructive",
      })
    }
  }

  const logout = () => {
    setSubscriber(null)
    setIsAuthenticated(false)
    setMeetings([])
    setActiveMeetings([])
    localStorage.removeItem("subscriber")
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
        <Navigation />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <Headphones className="h-6 w-6 text-green-600" />
                Subscriber Portal
              </CardTitle>
              <CardDescription>Enter your email to access your assigned meetings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={subscriberEmail}
                  onChange={(e) => setSubscriberEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  onKeyPress={(e) => e.key === "Enter" && authenticateSubscriber()}
                />
              </div>
              <Button
                onClick={authenticateSubscriber}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {loading ? "Authenticating..." : "Access Portal"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Headphones className="h-8 w-8 text-green-600" />
              Welcome, {subscriber?.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Listen to your assigned meetings through our audio streaming system
            </p>
          </div>
          <Button variant="outline" onClick={logout}>
            Logout
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Meetings</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{meetings.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Live Now</CardTitle>
              <div className="h-4 w-4 bg-green-500 rounded-full animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeMeetings.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Clock className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {
                  meetings.filter((m) => {
                    const weekAgo = new Date()
                    weekAgo.setDate(weekAgo.getDate() - 7)
                    return m.startTime >= weekAgo
                  }).length
                }
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="live" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="live" className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              Live Meetings
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Scheduled
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live">
            <div className="space-y-6">
              {activeMeetings.length > 0 ? (
                <>
                  <div className="text-center p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300 mb-2">
                      <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                      <span className="font-semibold">Live Meetings Available</span>
                    </div>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Click "Start Listening" to join the audio stream
                    </p>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {activeMeetings.map((meeting) => (
                      <MeetingCard key={meeting.id} meeting={meeting} showSubscriberView={true} />
                    ))}
                  </div>
                </>
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <Headphones className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Live Meetings</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      There are no active meetings assigned to you right now.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="scheduled">
            <div className="space-y-6">
              {meetings.filter((m) => m.status === "scheduled").length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {meetings
                    .filter((m) => m.status === "scheduled")
                    .map((meeting) => (
                      <MeetingCard key={meeting.id} meeting={meeting} showSubscriberView={true} />
                    ))}
                </div>
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Scheduled Meetings</h3>
                    <p className="text-gray-600 dark:text-gray-300">You don't have any upcoming meetings scheduled.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="space-y-6">
              {meetings.filter((m) => m.status === "ended").length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {meetings
                    .filter((m) => m.status === "ended")
                    .map((meeting) => (
                      <MeetingCard key={meeting.id} meeting={meeting} showSubscriberView={true} />
                    ))}
                </div>
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Meeting History</h3>
                    <p className="text-gray-600 dark:text-gray-300">Your completed meetings will appear here.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
