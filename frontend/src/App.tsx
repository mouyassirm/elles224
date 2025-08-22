import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import StockManagement from '@/pages/StockManagement'
import Movements from '@/pages/Movements'
import Finance from '@/pages/Finance'
import Reports from '@/pages/Reports'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/stock" element={<StockManagement />} />
            <Route path="/movements" element={<Movements />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </Layout>
        <Toaster />
      </div>
    </Router>
  )
}

export default App


