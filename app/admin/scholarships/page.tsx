"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Search, Plus, Edit, Trash2, MoreHorizontal, ExternalLink } from "lucide-react"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function ScholarshipsManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("All")
  const [scholarships, setScholarships] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"

  const fetchScholarships = async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`${API_BASE}/api/scholarships?status=All`)
      const data = await res.json()
      if (Array.isArray(data?.scholarships)) {
        setScholarships(data.scholarships)
      } else {
        setScholarships([])
      }
    } catch (e) {
      setScholarships([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchScholarships()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Compute display status (treat expired deadlines as Inactive)
  const computeDisplayStatus = (scholarship: any) => {
    try {
      if (scholarship?.deadline) {
        const dl = new Date(scholarship.deadline)
        if (!isNaN(dl.getTime())) {
          const now = new Date()
          const todayMidnightUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
          const deadlineMidnightUtc = new Date(Date.UTC(dl.getUTCFullYear(), dl.getUTCMonth(), dl.getUTCDate()))
          if (deadlineMidnightUtc.getTime() < todayMidnightUtc.getTime()) {
            return "Inactive"
          }
        }
      }
    } catch {}
    return scholarship.status
  }

  const filteredScholarships = scholarships.filter((scholarship: any) => {
    const matchesSearch =
      (scholarship.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      ((scholarship.provider?.name || scholarship.provider || "").toLowerCase().includes(searchTerm.toLowerCase()))
    const displayStatus = computeDisplayStatus(scholarship)
    const matchesFilter = filterStatus === "All" || displayStatus === filterStatus
    return matchesSearch && matchesFilter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800"
      case "Draft":
        return "bg-yellow-100 text-yellow-800"
      case "Inactive":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

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
              <h1 className="text-2xl font-bold text-gray-900">Manage Scholarships</h1>
            </div>
            <Link href="/admin/scholarships/new">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Add Scholarship
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search scholarships..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchScholarships}
              className="bg-white"
              disabled={isLoading}
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
            <Button
              variant={filterStatus === "All" ? "default" : "outline"}
              onClick={() => setFilterStatus("All")}
              className="bg-white"
            >
              All ({scholarships.length})
            </Button>
            <Button
              variant={filterStatus === "Active" ? "default" : "outline"}
              onClick={() => setFilterStatus("Active")}
              className="bg-white"
            >
              Active ({scholarships.filter((s: any) => computeDisplayStatus(s) === "Active").length})
            </Button>
            <Button
              variant={filterStatus === "Inactive" ? "default" : "outline"}
              onClick={() => setFilterStatus("Inactive")}
              className="bg-white"
            >
              Inactive ({scholarships.filter((s: any) => computeDisplayStatus(s) === "Inactive").length})
            </Button>
          </div>
        </div>

        {/* Scholarships List */}
        <div className="space-y-4">
          {filteredScholarships.map((scholarship: any) => (
            <Card key={scholarship._id || scholarship.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{scholarship.title}</h3>
                      {(() => {
                        const displayStatus = computeDisplayStatus(scholarship)
                        return (
                          <Badge className={getStatusColor(displayStatus)}>{displayStatus}</Badge>
                        )
                      })()}
                      <Badge variant="outline" className="bg-white">
                        {scholarship.category || "Scholarship"}
                      </Badge>
                    </div>

                    <p className="text-gray-600 mb-3">{scholarship.provider?.name || scholarship.provider || ""}</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Amount:</span>
                        <div className="font-semibold text-green-600">{typeof scholarship.amount === "number" ? scholarship.amount : (scholarship.amount || "-")}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Min CGPA:</span>
                        <div className="font-semibold">{scholarship.requirements?.minGPA ?? scholarship.minCGPA ?? "-"}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Deadline:</span>
                        <div className="font-semibold">{scholarship.deadline ? new Date(scholarship.deadline).toLocaleDateString() : (scholarship.extractedDeadline || "-")}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Applications:</span>
                        <div className="font-semibold text-blue-600">{scholarship.applicationCount ?? scholarship.applications ?? 0}</div>
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredScholarships.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">No scholarships found matching your criteria.</div>
            <Link href="/admin/scholarships/new">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Add First Scholarship
              </Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
