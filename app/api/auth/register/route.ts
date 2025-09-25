import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, profile } = body

    // Mock user creation
    const mockUser = {
      id: Date.now().toString(),
      name,
      email,
      role: "student",
      profile,
    }

    const mockToken = "mock-jwt-token-" + Date.now()

    return NextResponse.json({
      token: mockToken,
      user: mockUser,
    })
  } catch (error) {
    return NextResponse.json({ message: "Registration failed" }, { status: 400 })
  }
}
