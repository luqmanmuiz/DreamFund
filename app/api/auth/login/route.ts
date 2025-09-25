import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Mock admin login
    if (email === "admin@dreamfund.com" && password === "admin123") {
      const mockAdmin = {
        id: "admin-1",
        name: "System Administrator",
        email: "admin@dreamfund.com",
        role: "admin",
      }

      const mockToken = "mock-admin-token-" + Date.now()

      return NextResponse.json({
        token: mockToken,
        user: mockAdmin,
      })
    }

    return NextResponse.json({ message: "Invalid credentials" }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ message: "Login failed" }, { status: 500 })
  }
}
