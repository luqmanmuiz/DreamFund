import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Search, Eye, Download, Filter } from "lucide-react"
import Link from "next/link"

const users = [
  {
    id: 1,
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    cgpa: 3.8,
    course: "Computer Science",
    year: "3rd Year",
    matches: 12,
    applications: 5,
    lastActive: "2 hours ago",
    status: "Active",
  },
  {
    id: 2,
    name: "Michael Chen",
    email: "m.chen@email.com",
    cgpa: 3.6,
    course: "Engineering",
    year: "2nd Year",
    matches: 8,
    applications: 3,
    lastActive: "1 day ago",
    status: "Active",
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    email: "emily.r@email.com",
    cgpa: 3.9,
    course: "Medicine",
    year: "4th Year",
    matches: 15,
    applications: 8,
    lastActive: "3 hours ago",
    status: "Active",
  },
  {
    id: 4,
    name: "David Kim",
    email: "d.kim@email.com",
    cgpa: 3.4,
    course: "Business",
    year: "1st Year",
    matches: 6,
    applications: 2,
    lastActive: "1 week ago",
    status: "Inactive",
  },
  {
    id: 5,
    name: "Lisa Wang",
    email: "lisa.w@email.com",
    cgpa: 3.7,
    course: "Arts",
    year: "3rd Year",
    matches: 10,
    applications: 4,
    lastActive: "5 minutes ago",
    status: "Active",
  },
]

export default function UsersManagement() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/admin/dashboard" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Dashboard</span>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
            </div>
            <Button variant="outline" className="bg-white text-gray-600 border-gray-300 hover:bg-gray-50">
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">1,834</p>
                <p className="text-sm text-gray-600">Total Users</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">892</p>
                <p className="text-sm text-gray-600">Active This Week</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">3.2</p>
                <p className="text-sm text-gray-600">Avg Matches/User</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">67%</p>
                <p className="text-sm text-gray-600">Application Rate</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input placeholder="Search users by name or email..." className="pl-10 bg-white" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="bg-white">
              <Filter className="mr-2 h-4 w-4" />
              All Users
            </Button>
            <Button variant="outline" className="bg-white">
              Active
            </Button>
            <Button variant="outline" className="bg-white">
              Inactive
            </Button>
          </div>
        </div>

        {/* Users Table */}
        <Card className="bg-white shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-6 font-medium text-gray-900">User</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-900">Academic Info</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-900">Activity</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="py-4 px-6">
                        <div>
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">CGPA: {user.cgpa}</div>
                          <div className="text-gray-500">{user.course}</div>
                          <div className="text-gray-500">{user.year}</div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm">
                          <div className="text-gray-900">{user.matches} matches</div>
                          <div className="text-gray-500">{user.applications} applications</div>
                          <div className="text-gray-500">Last: {user.lastActive}</div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge
                          className={
                            user.status === "Active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }
                        >
                          {user.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-500">Showing 1 to 5 of 1,834 users</div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" disabled className="bg-white">
              Previous
            </Button>
            <Button variant="outline" size="sm" className="bg-white">
              Next
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
