import React, { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface DashboardData {
  stock_summary: {
    total_items: number
    total_value: number
    low_stock_items: number
  }
  financial_summary: {
    total_revenue: number
    total_sales: number
    average_discount: number
    best_selling_item: string | null
  }
  recent_movements: any[]
  recent_sales: any[]
}

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/reports/dashboard')
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }
      const data = await response.json()
      setDashboardData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Chargement...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Erreur: {error}</div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Aucune donnée disponible</div>
      </div>
    )
  }

  const { stock_summary, financial_summary } = dashboardData

  // Sample data for charts (in real app, this would come from API)
  const monthlyData = [
    { month: 'Jan', revenue: 12000, sales: 45 },
    { month: 'Fév', revenue: 15000, sales: 52 },
    { month: 'Mar', revenue: 18000, sales: 61 },
    { month: 'Avr', revenue: 14000, sales: 48 },
    { month: 'Mai', revenue: 22000, sales: 73 },
    { month: 'Juin', revenue: 25000, sales: 81 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="mt-2 text-gray-600">
          Vue d'ensemble de votre gestion de stock et de vos performances
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stock_summary.total_items}</div>
            <p className="text-xs text-muted-foreground">
              Articles en stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur Stock</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stock_summary.total_value)}</div>
            <p className="text-xs text-muted-foreground">
              Valeur totale
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(financial_summary.total_revenue)}</div>
            <p className="text-xs text-muted-foreground">
              Total des ventes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Faible</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stock_summary.low_stock_items}
            </div>
            <p className="text-xs text-muted-foreground">
              Articles à réapprovisionner
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Évolution des ventes</CardTitle>
            <CardDescription>
              Chiffre d'affaires mensuel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [
                    `${value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`,
                    'Revenus'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Volume des ventes</CardTitle>
            <CardDescription>
              Nombre de ventes par mois
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sales" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informations financières</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total des ventes:</span>
              <span className="font-medium">{financial_summary.total_sales}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Remise moyenne:</span>
              <span className="font-medium">{financial_summary.average_discount.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Meilleur vendeur:</span>
              <span className="font-medium">
                {financial_summary.best_selling_item || 'Aucun'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions rapides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <div className="font-medium">Ajouter un article</div>
              <div className="text-sm text-gray-600">Créer un nouvel article en stock</div>
            </button>
            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <div className="font-medium">Enregistrer une vente</div>
              <div className="text-sm text-gray-600">Vendre des articles du stock</div>
            </button>
            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <div className="font-medium">Voir les rapports</div>
              <div className="text-sm text-gray-600">Analyser les performances</div>
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}




                style: 'currency',

                currency: 'EUR'

              })}

            </div>

            <p className="text-xs text-muted-foreground">

              Total des ventes

            </p>

          </CardContent>

        </Card>



        <Card>

          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">

            <CardTitle className="text-sm font-medium">Stock Faible</CardTitle>

            <AlertTriangle className="h-4 w-4 text-muted-foreground" />

          </CardHeader>

          <CardContent>

            <div className="text-2xl font-bold text-orange-600">

              {stock_summary.low_stock_items}

            </div>

            <p className="text-xs text-muted-foreground">

              Articles à réapprovisionner

            </p>

          </CardContent>

        </Card>

      </div>



      {/* Charts */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        <Card>

          <CardHeader>

            <CardTitle>Évolution des ventes</CardTitle>

            <CardDescription>

              Chiffre d'affaires mensuel

            </CardDescription>

          </CardHeader>

          <CardContent>

            <ResponsiveContainer width="100%" height={300}>

              <LineChart data={monthlyData}>

                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="month" />

                <YAxis />

                <Tooltip 

                  formatter={(value) => [

                    `${value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`,

                    'Revenus'

                  ]}

                />

                <Line 

                  type="monotone" 

                  dataKey="revenue" 

                  stroke="#3b82f6" 

                  strokeWidth={2}

                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}

                />

              </LineChart>

            </ResponsiveContainer>

          </CardContent>

        </Card>



        <Card>

          <CardHeader>

            <CardTitle>Volume des ventes</CardTitle>

            <CardDescription>

              Nombre de ventes par mois

            </CardDescription>

          </CardHeader>

          <CardContent>

            <ResponsiveContainer width="100%" height={300}>

              <BarChart data={monthlyData}>

                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="month" />

                <YAxis />

                <Tooltip />

                <Bar dataKey="sales" fill="#10b981" />

              </BarChart>

            </ResponsiveContainer>

          </CardContent>

        </Card>

      </div>



      {/* Additional Info */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        <Card>

          <CardHeader>

            <CardTitle>Informations financières</CardTitle>

          </CardHeader>

          <CardContent className="space-y-4">

            <div className="flex justify-between">

              <span className="text-sm text-gray-600">Total des ventes:</span>

              <span className="font-medium">{financial_summary.total_sales}</span>

            </div>

            <div className="flex justify-between">

              <span className="text-sm text-gray-600">Remise moyenne:</span>

              <span className="font-medium">{financial_summary.average_discount.toFixed(1)}%</span>

            </div>

            <div className="flex justify-between">

              <span className="text-sm text-gray-600">Meilleur vendeur:</span>

              <span className="font-medium">

                {financial_summary.best_selling_item || 'Aucun'}

              </span>

            </div>

          </CardContent>

        </Card>



        <Card>

          <CardHeader>

            <CardTitle>Actions rapides</CardTitle>

          </CardHeader>

          <CardContent className="space-y-3">

            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">

              <div className="font-medium">Ajouter un article</div>

              <div className="text-sm text-gray-600">Créer un nouvel article en stock</div>

            </button>

            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">

              <div className="font-medium">Enregistrer une vente</div>

              <div className="text-sm text-gray-600">Vendre des articles du stock</div>

            </button>

            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">

              <div className="font-medium">Voir les rapports</div>

              <div className="text-sm text-gray-600">Analyser les performances</div>

            </button>

          </CardContent>

        </Card>

      </div>

    </div>

  )

}






