"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, ArrowLeft, User, RefreshCw } from "lucide-react"
import Link from "next/link"

const scholarships = [
  {
    id: 1,
    title: "Merit Excellence Scholarship",
    provider: "University Foundation",
    minCGPA: 3.5,
    amount: "$5,000",
    deadline: "March 15, 2024",
    matchPercentage: 95,
  },
  {
    id: 2,
    title: "Future Leaders Grant",
    provider: "Education Trust",
    minCGPA: 3.2,
    amount: "$3,000",
    deadline: "April 30, 2024",
    matchPercentage: 88,
  },
  {
    id: 3,
    title: "Innovation Scholarship",
    provider: "Tech Foundation",
    minCGPA: 3.0,
    amount: "$4,500",
    deadline: "May 20, 2024",
    matchPercentage: 82,
  },
  {
    id: 4,
    title: "Community Impact Award",
    provider: "Social Foundation",
    minCGPA: 2.8,
    amount: "$2,500",
    deadline: "June 10, 2024",
    matchPercentage: 75,
  },
]

export default function ResultsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center space-x-2">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
              <span className="text-gray-600">Back to Home</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/profile">
                <Button variant="outline" className="bg-white text-blue-600 border-blue-600 hover:bg-blue-50">
                  <User className="mr-2 h-4 w-4" />
                  Update Profile
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">DreamFund</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Results Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Your Scholarship Matches</h2>
          <p className="text-lg text-gray-600 mb-6">
            Based on your academic profile, we found {scholarships.length} scholarships that match your qualifications.
          </p>

          <div className="bg-white rounded-lg shadow-sm p-4 max-w-md mx-auto">
            <div className="text-sm text-gray-600 mb-2">Your Profile Summary</div>
            <div className="flex justify-between items-center text-sm">
              <span>
                CGPA: <strong>3.7</strong>
              </span>
              <span>
                Course: <strong>Computer Science</strong>
              </span>
              <span>
                Interest: <strong>AI/ML</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Scholarship Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          {scholarships.map((scholarship) => (
            <Card key={scholarship.id} className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <CardTitle className="text-xl text-gray-900">{scholarship.title}</CardTitle>
                  <Badge
                    variant="secondary"
                    className={`${
                      scholarship.matchPercentage >= 90
                        ? "bg-green-100 text-green-800"
                        : scholarship.matchPercentage >= 80
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {scholarship.matchPercentage}% Match
                  </Badge>
                </div>
                <CardDescription className="text-gray-600">
                  <strong>{scholarship.provider}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Amount:</span>
                    <div className="font-semibold text-green-600">{scholarship.amount}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Min CGPA:</span>
                    <div className="font-semibold">{scholarship.minCGPA}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Deadline:</span>
                    <div className="font-semibold text-red-600">{scholarship.deadline}</div>
                  </div>
                </div>

                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Apply Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-12 text-center space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/profile">
              <Button variant="outline" className="bg-white text-blue-600 border-blue-600 hover:bg-blue-50">
                <RefreshCw className="mr-2 h-4 w-4" />
                Update Profile for Better Matches
              </Button>
            </Link>
            <Link href="/upload">
              <Button variant="outline" className="bg-white text-gray-600 border-gray-300 hover:bg-gray-50">
                Upload New Transcript
              </Button>
            </Link>
          </div>

          <p className="text-sm text-gray-500">
            Results are updated daily. Check back regularly for new scholarship opportunities.
          </p>
        </div>
      </main>
    </div>
  )
}
