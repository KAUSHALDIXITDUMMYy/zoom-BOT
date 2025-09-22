import { db } from "./firebase"
import { collection, query, where, getDocs } from "firebase/firestore"
import type { User } from "./types"

export class AuthService {
  private static instance: AuthService
  private currentUser: User | null = null

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  async login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Query users collection for matching email and password
      const usersRef = collection(db, "users")
      const q = query(
        usersRef,
        where("email", "==", email),
        where("password", "==", password),
        where("isActive", "==", true),
      )
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        return { success: false, error: "Invalid email or password" }
      }

      const userDoc = querySnapshot.docs[0]
      const userData = userDoc.data()
      const user: User = {
        id: userDoc.id,
        email: userData.email,
        password: userData.password,
        role: userData.role,
        name: userData.name,
        createdAt: userData.createdAt.toDate(),
        isActive: userData.isActive,
      }

      this.currentUser = user
      localStorage.setItem("currentUser", JSON.stringify(user))
      localStorage.setItem("userRole", user.role)

      return { success: true, user }
    } catch (error) {
      console.error("Login error:", error)
      return { success: false, error: "Login failed. Please try again." }
    }
  }

  logout(): void {
    this.currentUser = null
    localStorage.removeItem("currentUser")
    localStorage.removeItem("userRole")
  }

  getCurrentUser(): User | null {
    if (this.currentUser) {
      return this.currentUser
    }

    const storedUser = localStorage.getItem("currentUser")
    if (storedUser) {
      this.currentUser = JSON.parse(storedUser)
      return this.currentUser
    }

    return null
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null
  }

  hasRole(role: "admin" | "subscriber"): boolean {
    const user = this.getCurrentUser()
    return user?.role === role
  }

  requireAuth(): User | null {
    const user = this.getCurrentUser()
    if (!user) {
      window.location.href = "/login"
      return null
    }
    return user
  }

  requireRole(role: "admin" | "subscriber"): User | null {
    const user = this.requireAuth()
    if (user && user.role !== role) {
      window.location.href = "/unauthorized"
      return null
    }
    return user
  }
}

export const authService = AuthService.getInstance()
