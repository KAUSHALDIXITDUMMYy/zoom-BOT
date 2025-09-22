"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Video, Headphones, Settings, LogIn } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { authService } from "@/lib/auth"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function HomePage() {
  const [stats, setStats] = useState({
    totalMeetings: 0,
    activeMeetings: 0,
    totalSubscribers: 0,
    activeStreams: 0,
  })
  const router = useRouter()

  useEffect(() => {
    // Check if user is already authenticated and redirect to appropriate dashboard
    const user = authService.getCurrentUser()
    if (user) {
      if (user.role === "admin") {
        router.push("/admin")
      } else if (user.role === "subscriber") {
        router.push("/subscriber")
      }
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Zoom Meeting Manager</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Create Zoom meetings, assign subscribers, and stream audio through intelligent bots
          </p>
        </div>

        {/* Login Prompt */}
        <div className="text-center mb-12">
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <LogIn className="h-5 w-5 text-blue-600" />
                Get Started
              </CardTitle>
              <CardDescription>Sign in to access your dashboard and manage meetings</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">Sign In to Continue</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Meetings</CardTitle>
              <Video className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.totalMeetings}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Meetings</CardTitle>
              <div className="h-4 w-4 bg-green-500 rounded-full animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.activeMeetings}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.totalSubscribers}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Streams</CardTitle>
              <Headphones className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.activeStreams}</div>
            </CardContent>
          </Card>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                Admin Dashboard
              </CardTitle>
              <CardDescription>
                Create and manage Zoom meetings, assign subscribers, and monitor bot activity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Meeting Creation</Badge>
                <Badge variant="secondary">Subscriber Management</Badge>
                <Badge variant="secondary">Bot Monitoring</Badge>
              </div>
              <Link href="/admin">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">Access Admin Dashboard</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Headphones className="h-5 w-5 text-green-600" />
                Subscriber Portal
              </CardTitle>
              <CardDescription>
                Listen to assigned meetings through our intelligent audio streaming system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Live Audio</Badge>
                <Badge variant="secondary">Meeting History</Badge>
                <Badge variant="secondary">Stream Quality</Badge>
              </div>
              <Link href="/subscriber">
                <Button className="w-full bg-green-600 hover:bg-green-700">Access Subscriber Portal</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* How it Works */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Create Meeting</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Admin creates Zoom meetings and assigns them to specific subscribers
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Bot Joins</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Our intelligent bot automatically joins the meeting and captures audio
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Headphones className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Stream Audio</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Subscribers listen to the meeting audio through our secure streaming system
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
