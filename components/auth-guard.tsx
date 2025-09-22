"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { authService } from "@/lib/auth"
import type { User } from "@/lib/types"
import { Loader2 } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: "admin" | "subscriber"
  fallback?: React.ReactNode
}

export function AuthGuard({ children, requiredRole, fallback }: AuthGuardProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = () => {
      const currentUser = authService.getCurrentUser()

      if (!currentUser) {
        window.location.href = "/login"
        return
      }

      if (requiredRole && currentUser.role !== requiredRole) {
        window.location.href = "/unauthorized"
        return
      }

      setUser(currentUser)
      setIsLoading(false)
    }

    checkAuth()
  }, [requiredRole])

  if (isLoading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Checking authentication...</p>
          </div>
        </div>
      )
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}
