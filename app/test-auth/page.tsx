"use client"

import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"

export default function TestAuth() {
  const { user, login, logout, loading, isAuthenticated } = useAuth()

  const handleLogin = async () => {
    await login({
      email: "admin@dreamfund.com",
      password: "admin123",
    })
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Test</h1>

      {isAuthenticated ? (
        <div>
          <p>Welcome, {user?.name}!</p>
          <p>Email: {user?.email}</p>
          <p>Role: {user?.role}</p>
          <Button onClick={logout} className="mt-4">
            Logout
          </Button>
        </div>
      ) : (
        <div>
          <p>Not authenticated</p>
          <Button onClick={handleLogin} className="mt-4">
            Login as Admin
          </Button>
        </div>
      )}
    </div>
  )
}
