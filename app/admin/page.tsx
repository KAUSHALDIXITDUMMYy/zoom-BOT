"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Video, Users, Eye, Trash2, Calendar, Clock } from "lucide-react"
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { ZoomMeeting, User } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { Navigation } from "@/components/navigation"
import { ClientBot } from "@/components/client-bot"
import { AuthGuard } from "@/components/auth-guard"

export default function AdminDashboard() {
  const [players, setPlayers] = useState<User[]>([])
  const [meetings, setMeetings] = useState<ZoomMeeting[]>([])
  const [loading, setLoading] = useState(false)
  const [isCreateMeetingOpen, setIsCreateMeetingOpen] = useState(false)
  const [isCreatePlayerOpen, setIsCreatePlayerOpen] = useState(false)
  const { toast } = useToast()

  // Form states
  const [newPlayer, setNewPlayer] = useState({
    name: "",
    email: "",
    password: "",
  })

  const [newMeeting, setNewMeeting] = useState({
    topic: "",
    meetingId: "",
    meetingUrl: "",
    meetingPassword: "",
    startTime: "",
    duration: 60,
    assignedSubscriberIds: [] as string[],
  })

  useEffect(() => {
    loadPlayers()
    loadMeetings()
  }, [])

  const loadPlayers = async () => {
    try {
      const q = query(collection(db, "users"), where("role", "==", "subscriber"), orderBy("createdAt", "desc"))
      const querySnapshot = await getDocs(q)
      const playersList: User[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        playersList.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
        } as User)
      })
      setPlayers(playersList)
    } catch (error) {
      console.error("Error loading players:", error)
      toast({
        title: "Error",
        description: "Failed to load players",
        variant: "destructive",
      })
    }
  }

  const loadMeetings = async () => {
    try {
      const q = query(collection(db, "meetings"), orderBy("createdAt", "desc"))
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
    } catch (error) {
      console.error("Error loading meetings:", error)
      toast({
        title: "Error",
        description: "Failed to load meetings",
        variant: "destructive",
      })
    }
  }

  const createPlayer = async () => {
    if (!newPlayer.name || !newPlayer.email || !newPlayer.password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      await addDoc(collection(db, "users"), {
        name: newPlayer.name,
        email: newPlayer.email,
        password: newPlayer.password,
        role: "subscriber",
        isActive: true,
        createdAt: new Date(),
      })

      setNewPlayer({ name: "", email: "", password: "" })
      setIsCreatePlayerOpen(false)
      loadPlayers()

      toast({ title: "Success", description: "Player created successfully" })
    } catch (error) {
      console.error("Error creating player:", error)
      toast({
        title: "Error",
        description: "Failed to create player",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const addExternalMeeting = async () => {
    if (!newMeeting.topic || !newMeeting.meetingId || !newMeeting.meetingUrl || newMeeting.assignedSubscriberIds.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const assignedNames = players
        .filter((p) => newMeeting.assignedSubscriberIds.includes(p.id))
        .map((p) => p.name)

      // Save externally created meeting to Firebase
      await addDoc(collection(db, "meetings"), {
        meetingId: newMeeting.meetingId,
        meetingUrl: newMeeting.meetingUrl,
        meetingPassword: newMeeting.meetingPassword,
        topic: newMeeting.topic,
        startTime: new Date(newMeeting.startTime),
        duration: newMeeting.duration,
        assignedSubscriberIds: newMeeting.assignedSubscriberIds,
        assignedSubscriberNames: assignedNames,
        status: "scheduled",
        createdAt: new Date(),
        botJoined: false,
        isExternal: true,
      })

      setNewMeeting({
        topic: "",
        meetingId: "",
        meetingUrl: "",
        meetingPassword: "",
        startTime: "",
        duration: 60,
        assignedSubscriberIds: [],
      })
      setIsCreateMeetingOpen(false)
      loadMeetings()

      toast({ title: "Success", description: "External meeting added successfully" })
    } catch (error) {
      console.error("Error adding external meeting:", error)
      toast({ title: "Error", description: "Failed to add external meeting", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const deleteSubscriber = async (id: string) => {
    try {
      await deleteDoc(doc(db, "subscribers", id))
      loadSubscribers()
      toast({
        title: "Success",
        description: "Subscriber deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting subscriber:", error)
      toast({
        title: "Error",
        description: "Failed to delete subscriber",
        variant: "destructive",
      })
    }
  }

  const updateMeetingStatus = async (meetingId: string, status: string) => {
    try {
      await updateDoc(doc(db, "meetings", meetingId), { status })
      loadMeetings()
      toast({
        title: "Success",
        description: "Meeting status updated",
      })
    } catch (error) {
      console.error("Error updating meeting:", error)
      toast({
        title: "Error",
        description: "Failed to update meeting",
        variant: "destructive",
      })
    }
  }

  const startBotForMeeting = async (meetingId: string) => {
    try {
      await fetch("/api/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId, action: "join" }),
      })
      await loadMeetings()
      toast({ title: "Bot", description: "Bot join requested" })
    } catch (error) {
      console.error("Error starting bot:", error)
      toast({ title: "Error", description: "Failed to start bot", variant: "destructive" })
    }
  }

  const stopBotForMeeting = async (meetingId: string) => {
    try {
      await fetch("/api/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId, action: "leave" }),
      })
      await loadMeetings()
      toast({ title: "Bot", description: "Bot leave requested" })
    } catch (error) {
      console.error("Error stopping bot:", error)
      toast({ title: "Error", description: "Failed to stop bot", variant: "destructive" })
    }
  }

  return (
    <AuthGuard requiredRole="admin">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Manage meetings, subscribers, and monitor bot activity
              </p>
            </div>
            <div className="flex gap-2">
              <Dialog open={isCreatePlayerOpen} onOpenChange={setIsCreatePlayerOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                    <Users className="h-4 w-4" />
                    Add Player
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Player</DialogTitle>
                    <DialogDescription>Add a new player (subscriber) who can listen to meeting audio streams</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="pname">Name</Label>
                      <Input id="pname" value={newPlayer.name} onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })} placeholder="Enter player name" />
                    </div>
                    <div>
                      <Label htmlFor="pemail">Email</Label>
                      <Input id="pemail" type="email" value={newPlayer.email} onChange={(e) => setNewPlayer({ ...newPlayer, email: e.target.value })} placeholder="Enter player email" />
                    </div>
                    <div>
                      <Label htmlFor="ppass">Password</Label>
                      <Input id="ppass" type="password" value={newPlayer.password} onChange={(e) => setNewPlayer({ ...newPlayer, password: e.target.value })} placeholder="Enter password" />
                    </div>
                    <Button onClick={createPlayer} disabled={loading} className="w-full">{loading ? "Creating..." : "Create Player"}</Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isCreateMeetingOpen} onOpenChange={setIsCreateMeetingOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add External Meeting
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add External Meeting</DialogTitle>
                    <DialogDescription>
                      Add a Zoom meeting created externally and assign it to a subscriber
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="topic">Meeting Topic</Label>
                      <Input
                        id="topic"
                        value={newMeeting.topic}
                        onChange={(e) => setNewMeeting({ ...newMeeting, topic: e.target.value })}
                        placeholder="Enter meeting topic"
                      />
                    </div>
                    <div>
                      <Label htmlFor="meetingId">Meeting ID</Label>
                      <Input
                        id="meetingId"
                        value={newMeeting.meetingId}
                        onChange={(e) => setNewMeeting({ ...newMeeting, meetingId: e.target.value })}
                        placeholder="Enter Zoom meeting ID"
                      />
                    </div>
                    <div>
                      <Label htmlFor="meetingUrl">Meeting URL</Label>
                      <Input
                        id="meetingUrl"
                        value={newMeeting.meetingUrl}
                        onChange={(e) => setNewMeeting({ ...newMeeting, meetingUrl: e.target.value })}
                        placeholder="Enter Zoom meeting URL"
                      />
                    </div>
                    <div>
                      <Label htmlFor="meetingPassword">Meeting Password (Optional)</Label>
                      <Input
                        id="meetingPassword"
                        value={newMeeting.meetingPassword}
                        onChange={(e) => setNewMeeting({ ...newMeeting, meetingPassword: e.target.value })}
                        placeholder="Enter meeting password if required"
                      />
                    </div>
                    <div>
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input
                        id="startTime"
                        type="datetime-local"
                        value={newMeeting.startTime}
                        onChange={(e) => setNewMeeting({ ...newMeeting, startTime: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="duration">Duration (minutes)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={newMeeting.duration}
                        onChange={(e) => setNewMeeting({ ...newMeeting, duration: Number.parseInt(e.target.value) })}
                        min="15"
                        max="480"
                      />
                    </div>
                    <div>
                      <Label htmlFor="subscriber">Assign to Players</Label>
                      <div className="border rounded-md p-2 max-h-40 overflow-auto">
                        {players.map((p) => {
                          const selected = newMeeting.assignedSubscriberIds.includes(p.id)
                          return (
                            <label key={p.id} className="flex items-center gap-2 py-1 cursor-pointer">
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={selected}
                                onChange={(e) => {
                                  setNewMeeting((prev) => ({
                                    ...prev,
                                    assignedSubscriberIds: e.target.checked
                                      ? [...prev.assignedSubscriberIds, p.id]
                                      : prev.assignedSubscriberIds.filter((id) => id !== p.id),
                                  }))
                                }}
                              />
                              <span className="text-sm">{p.name} ({p.email})</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                    <Button onClick={addExternalMeeting} disabled={loading} className="w-full">
                      {loading ? "Adding..." : "Add Meeting"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Tabs defaultValue="meetings" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="meetings" className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Meetings
              </TabsTrigger>
              <TabsTrigger value="subscribers" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Players
              </TabsTrigger>
            </TabsList>

            <TabsContent value="meetings">
              <Card>
                <CardHeader>
                  <CardTitle>Meeting Management</CardTitle>
                  <CardDescription>View and manage all Zoom meetings and their assignments</CardDescription>
                </CardHeader>
                <CardContent>
                  {meetings.filter((m) => m.status === "live").length > 0 && (
                    <div className="mb-6 space-y-4">
                      <h3 className="text-lg font-semibold">Active Meeting Bots</h3>
                      {meetings
                        .filter((m) => m.status === "live")
                        .map((meeting) => (
                          <ClientBot
                            key={meeting.id}
                            meeting={meeting}
                            onStatusChange={(status) => console.log(`Bot status for ${meeting.topic}:`, status)}
                          />
                        ))}
                    </div>
                  )}

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Topic</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Start Time</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Bot Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {meetings.map((meeting) => (
                        <TableRow key={meeting.id}>
                          <TableCell className="font-medium">{meeting.topic}</TableCell>
                          <TableCell>{(meeting as any).assignedSubscriberNames?.join(", ") || meeting.assignedSubscriberName}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              {meeting.startTime.toLocaleDateString()}
                              <Clock className="h-4 w-4 text-gray-400 ml-2" />
                              {meeting.startTime.toLocaleTimeString()}
                            </div>
                          </TableCell>
                          <TableCell>{meeting.duration} min</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                meeting.status === "live"
                                  ? "default"
                                  : meeting.status === "scheduled"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {meeting.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={meeting.botJoined ? "default" : "outline"}>
                              {meeting.botJoined ? "Joined" : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(meeting.meetingUrl, "_blank")}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(`/bot?meetingId=${meeting.id}`, "_blank")}
                              >
                                Bot Agent
                              </Button>
                              {meeting.botJoined ? (
                                <Button size="sm" variant="destructive" onClick={() => stopBotForMeeting(meeting.id)}>
                                  Stop Bot
                                </Button>
                              ) : (
                                <Button size="sm" onClick={() => startBotForMeeting(meeting.id)}>
                                  Start Bot
                                </Button>
                              )}
                              <Select
                                value={meeting.status}
                                onValueChange={(value) => updateMeetingStatus(meeting.id, value)}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="scheduled">Scheduled</SelectItem>
                                  <SelectItem value="live">Live</SelectItem>
                                  <SelectItem value="ended">Ended</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="subscribers">
              <Card>
                <CardHeader>
                  <CardTitle>Player Management</CardTitle>
                  <CardDescription>Manage players who can listen to meeting audio streams</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {players.map((player) => (
                        <TableRow key={player.id}>
                          <TableCell className="font-medium">{player.name}</TableCell>
                          <TableCell>{player.email}</TableCell>
                          <TableCell>
                            <Badge variant={player.isActive ? "default" : "outline"}>{player.isActive ? "Active" : "Inactive"}</Badge>
                          </TableCell>
                          <TableCell>{player.createdAt.toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => deleteDoc(doc(db, "users", player.id)).then(loadPlayers)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthGuard>
  )
}
