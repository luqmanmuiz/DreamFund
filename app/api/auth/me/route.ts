import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Mock user data for demo
    const mockUser = {
      id: "1",
      name: "Demo User",
      email: "demo@dreamfund.com",
      role: "student",
      profile: {
        cgpa: 3.7,
        course: "Computer Science",
        year: "3rd Year",
        university: "Demo University",
        interests: "AI, Machine Learning",
      },
    }

    return NextResponse.json(mockUser)
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
