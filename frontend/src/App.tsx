import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Unauthorized from '@/pages/Unauthorized'
import Dashboard from '@/pages/Dashboard'
import StockManagement from '@/pages/StockManagement'
import Movements from '@/pages/Movements'
import Finance from '@/pages/Finance'
import Reports from '@/pages/Reports'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/stock" element={
              <ProtectedRoute allowBoth>
                <Layout>
                  <StockManagement />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/movements" element={
              <ProtectedRoute allowBoth>
                <Layout>
                  <Movements />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/finance" element={
              <ProtectedRoute requiredRole="ceo">
                <Layout>
                  <Finance />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute requiredRole="ceo">
                <Layout>
                  <Reports />
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
          <Toaster />
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App





