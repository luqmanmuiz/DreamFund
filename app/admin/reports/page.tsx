import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Download, TrendingUp, Users, Award, BarChart3 } from "lucide-react"
import Link from "next/link"

export default function ReportsPage() {
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
              <h1 className="text-2xl font-bold text-gray-900">System Reports</h1>
            </div>
            <Button variant="outline" className="bg-white text-gray-600 border-gray-300 hover:bg-gray-50">
              <Download className="mr-2 h-4 w-4" />
              Export Reports
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Matches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className="text-2xl font-bold text-gray-900">5,672</div>
                <TrendingUp className="ml-2 h-4 w-4 text-green-600" />
              </div>
              <p className="text-sm text-green-600 mt-1">+12% from last month</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className="text-2xl font-bold text-gray-900">89%</div>
                <TrendingUp className="ml-2 h-4 w-4 text-green-600" />
              </div>
              <p className="text-sm text-green-600 mt-1">+5% from last month</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className="text-2xl font-bold text-gray-900">1,834</div>
                <Users className="ml-2 h-4 w-4 text-blue-600" />
              </div>
              <p className="text-sm text-blue-600 mt-1">+156 new this week</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className="text-2xl font-bold text-gray-900">12,456</div>
                <Award className="ml-2 h-4 w-4 text-purple-600" />
              </div>
              <p className="text-sm text-purple-600 mt-1">+23% this month</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">Usage Analytics</CardTitle>
              <CardDescription>User activity over the past 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                  <p>Usage chart would be displayed here</p>
                  <p className="text-sm">Integration with charting library needed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">Match Success Rate</CardTitle>
              <CardDescription>Scholarship matching performance trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2" />
                  <p>Success rate chart would be displayed here</p>
                  <p className="text-sm">Integration with charting library needed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">Top Performing Scholarships</CardTitle>
              <CardDescription>Most applied scholarships this month</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">Merit Excellence</p>
                  <p className="text-sm text-gray-500">University Foundation</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-blue-600">234 apps</p>
                  <p className="text-sm text-gray-500">+15%</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">Future Leaders</p>
                  <p className="text-sm text-gray-500">Education Trust</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-blue-600">156 apps</p>
                  <p className="text-sm text-gray-500">+8%</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">Innovation Grant</p>
                  <p className="text-sm text-gray-500">Tech Foundation</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-blue-600">89 apps</p>
                  <p className="text-sm text-gray-500">+22%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">User Demographics</CardTitle>
              <CardDescription>Student distribution by course</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-900">Computer Science</span>
                <span className="font-medium text-blue-600">28%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-900">Engineering</span>
                <span className="font-medium text-green-600">22%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-900">Business</span>
                <span className="font-medium text-purple-600">18%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-900">Medicine</span>
                <span className="font-medium text-orange-600">15%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-900">Others</span>
                <span className="font-medium text-gray-600">17%</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">System Performance</CardTitle>
              <CardDescription>Platform health metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-900">Uptime</span>
                <span className="font-medium text-green-600">99.9%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-900">Avg Response Time</span>
                <span className="font-medium text-blue-600">1.2s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-900">Error Rate</span>
                <span className="font-medium text-green-600">0.1%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-900">Daily Active Users</span>
                <span className="font-medium text-purple-600">892</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-900">Storage Used</span>
                <span className="font-medium text-orange-600">2.4GB</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
