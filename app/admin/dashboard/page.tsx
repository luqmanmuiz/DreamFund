import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Globe, GraduationCap, Users, BarChart3, LogOut, Plus, Download, TrendingUp, Award } from "lucide-react"
import Link from "next/link"

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">DreamFund Admin</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Admin Panel
              </Badge>
              <Link href="/">
                <Button variant="outline" className="bg-white text-gray-600 border-gray-300 hover:bg-gray-50">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, Admin</h2>
          <p className="text-gray-600">Manage scholarships, users, and system operations from your dashboard.</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Scholarships</p>
                  <p className="text-3xl font-bold text-gray-900">247</p>
                </div>
                <Award className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-sm text-green-600 mt-2">+12 this month</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-3xl font-bold text-gray-900">1,834</p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-sm text-green-600 mt-2">+156 this week</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Matches Made</p>
                  <p className="text-3xl font-bold text-gray-900">5,672</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <p className="text-sm text-green-600 mt-2">+89% success rate</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Applications</p>
                  <p className="text-3xl font-bold text-gray-900">12,456</p>
                </div>
                <BarChart3 className="h-8 w-8 text-orange-600" />
              </div>
              <p className="text-sm text-green-600 mt-2">+23% this month</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          {/* Scrape Scholarships */}
          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Globe className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl text-gray-900">Scrape Scholarships</CardTitle>
                  <CardDescription>Automatically fetch new scholarships from Afterschool</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Last scrape:</span>
                  <span className="font-medium">2 hours ago</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-gray-600">New scholarships found:</span>
                  <span className="font-medium text-green-600">8</span>
                </div>
              </div>
              <Link href="/admin/scrape">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  <Download className="mr-2 h-4 w-4" />
                  Start Scraping
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Manage Scholarships */}
          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 p-3 rounded-lg">
                  <Award className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-xl text-gray-900">Manage Scholarships</CardTitle>
                  <CardDescription>View, edit, and delete scholarship listings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Total scholarships:</span>
                  <span className="font-medium">247</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-gray-600">Active:</span>
                  <span className="font-medium text-green-600">231</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <Link href="/admin/scholarships" className="flex-1">
                  <Button
                    variant="outline"
                    className="w-full bg-white text-green-600 border-green-600 hover:bg-green-50"
                  >
                    View All
                  </Button>
                </Link>
                <Link href="/admin/scholarships/new">
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    <Plus className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Manage Users */}
          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-xl text-gray-900">Manage Users</CardTitle>
                  <CardDescription>View student profiles and activity</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Total users:</span>
                  <span className="font-medium">1,834</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-gray-600">Active this week:</span>
                  <span className="font-medium text-purple-600">892</span>
                </div>
              </div>
              <Link href="/admin/users">
                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                  <Users className="mr-2 h-4 w-4" />
                  View Users
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* System Reports */}
          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="bg-orange-100 p-3 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-xl text-gray-900">System Reports</CardTitle>
                  <CardDescription>Analytics, usage statistics, and performance</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Match success rate:</span>
                  <span className="font-medium text-green-600">89%</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-gray-600">Avg. matches per user:</span>
                  <span className="font-medium">3.2</span>
                </div>
              </div>
              <Link href="/admin/reports">
                <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Reports
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-gray-900">Recent Activity</CardTitle>
              <CardDescription>Latest system events and user activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                  <div className="bg-blue-600 w-2 h-2 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">New scholarship added: "Tech Innovation Grant"</p>
                    <p className="text-xs text-gray-500">2 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <div className="bg-green-600 w-2 h-2 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">156 new user registrations this week</p>
                    <p className="text-xs text-gray-500">1 hour ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                  <div className="bg-purple-600 w-2 h-2 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Scholarship scraping completed: 8 new entries</p>
                    <p className="text-xs text-gray-500">2 hours ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
