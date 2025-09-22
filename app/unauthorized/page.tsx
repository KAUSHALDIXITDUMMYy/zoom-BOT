"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Home, LogOut } from "lucide-react"
import { authService } from "@/lib/auth"
import { useRouter } from "next/navigation"

export default function UnauthorizedPage() {
  const router = useRouter()

  const handleLogout = () => {
    authService.logout()
    router.push("/login")
  }

  const handleGoHome = () => {
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-red-600">Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to access this page. Please contact your administrator if you believe this is an
            error.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleGoHome} className="w-full bg-blue-600 hover:bg-blue-700">
            <Home className="mr-2 h-4 w-4" />
            Go to Home
          </Button>
          <Button onClick={handleLogout} variant="outline" className="w-full bg-transparent">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
