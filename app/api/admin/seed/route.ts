import { NextResponse } from "next/server"
import { collection, query, where, getDocs, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "email and password are required" }, { status: 400 })
    }

    // Check if an admin already exists
    const q = query(collection(db, "users"), where("role", "==", "admin"))
    const snap = await getDocs(q)

    if (!snap.empty) {
      return NextResponse.json({ error: "Admin already exists" }, { status: 409 })
    }

    await addDoc(collection(db, "users"), {
      name: name || "Admin",
      email,
      password,
      role: "admin",
      isActive: true,
      createdAt: new Date(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[seed-admin] error:", error)
    return NextResponse.json({ error: "Failed to create admin" }, { status: 500 })
  }
}


