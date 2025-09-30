import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext"
import { ScholarshipProvider } from "./contexts/ScholarshipContext"

// Pages
import LandingPage from "./pages/LandingPage"
import UploadPage from "./pages/UploadPage"
import ProfilePage from "./pages/ProfilePage"
import ResultsPage from "./pages/ResultsPage"
import OTPLoginPage from "./pages/OTPLoginPage"
import AdminLogin from "./pages/admin/AdminLogin"
import AdminDashboard from "./pages/admin/AdminDashboard"
import ScholarshipManagement from "./pages/admin/ScholarshipManagement"
import UserManagement from "./pages/admin/UserManagement"
import ReportsPage from "./pages/admin/ReportsPage"

// Components
import ProtectedRoute from "./components/ProtectedRoute"

import "./App.css"

function App() {
  return (
    <AuthProvider>
      <ScholarshipProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<OTPLoginPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/results/:userId" element={<ResultsPage />} />
              <Route path="/results" element={<Navigate to="/results/me" />} />

              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/scholarships"
                element={
                  <ProtectedRoute adminOnly>
                    <ScholarshipManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute adminOnly>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <ProtectedRoute adminOnly>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </Router>
      </ScholarshipProvider>
    </AuthProvider>
  )
}

export default App
