import { type NextRequest, NextResponse } from "next/server"

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { profile } = body

    return NextResponse.json({
      message: "Profile updated successfully",
      profile,
    })
  } catch (error) {
    return NextResponse.json({ message: "Profile update failed" }, { status: 500 })
  }
}
