import React, { useState, useEffect, useMemo } from 'react'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package, DollarSign, TrendingUp, AlertTriangle, RefreshCw, Plus, ShoppingCart, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { useNavigate } from 'react-router-dom'

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

interface Movement {
  id: number
  date: string
  movement_type: 'purchase' | 'sale'
  quantity: number
  discount_percent: number
  stock: {
    id: number
    reference: string
    name: string
    unit_price: number
  }
}

interface Sale {
  id: number
  date: string
  quantity_sold: number
  unit_price: number
  discount_percent: number
  total_revenue: number
  stock: {
    id: number
    reference: string
    name: string
  }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [movements, setMovements] = useState<Movement[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')

  useEffect(() => {
    fetchDashboardData()
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
      setLoading(true)
      }
      setError(null)
      
      // Fetch dashboard data
      try {
        const dashboardRes = await fetch('/api/reports/dashboard')
        if (!dashboardRes.ok) {
          throw new Error(`Erreur dashboard: ${dashboardRes.status}`)
        }
        const dashboardData = await dashboardRes.json()
        setDashboardData(dashboardData)
      } catch (err) {
        console.error('Erreur dashboard:', err)
        // Fallback: create minimal dashboard data
        setDashboardData({
          stock_summary: { total_items: 0, total_value: 0, low_stock_items: 0 },
          financial_summary: { total_revenue: 0, total_sales: 0, average_discount: 0, best_selling_item: null },
          recent_movements: [],
          recent_sales: []
        })
      }
      
      // Fetch movements data
      try {
        const movementsRes = await fetch('/api/movements?limit=100')
        if (movementsRes.ok) {
          const movementsData = await movementsRes.json()
          setMovements(movementsData)
        } else {
          console.warn('Erreur lors du chargement des mouvements:', movementsRes.status)
          setMovements([])
        }
      } catch (err) {
        console.warn('Erreur mouvements:', err)
        setMovements([])
      }
      
      // Fetch sales data
      try {
        const salesRes = await fetch('/api/finance/sales?limit=100')
        if (salesRes.ok) {
          const salesData = await salesRes.json()
          setSales(salesData)
        } else {
          console.warn('Erreur lors du chargement des ventes:', salesRes.status)
          setSales([])
        }
      } catch (err) {
        console.warn('Erreur ventes:', err)
        setSales([])
      }
      
    } catch (err) {
      console.error('Erreur générale:', err)
      setError('Erreur de connexion au serveur. Vérifiez que le backend est démarré.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchDashboardData(true)
  }

  // Calculate chart data from real data
  const chartData = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    
    // Initialize monthly data structure
    const monthlyData: { [key: string]: { month: string; revenue: number; sales: number; purchases: number } } = {}
    
    // Create months array based on time range
    let monthsToShow: string[] = []
    if (timeRange === '7d') {
      // Show last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        const monthKey = date.toISOString().split('T')[0]
        monthlyData[monthKey] = { 
          month: date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }), 
          revenue: 0, 
          sales: 0, 
          purchases: 0 
        }
        monthsToShow.push(monthKey)
      }
    } else if (timeRange === '30d') {
      // Show last 30 days
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        const monthKey = date.toISOString().split('T')[0]
        monthlyData[monthKey] = { 
          month: date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }), 
          revenue: 0, 
          sales: 0, 
          purchases: 0 
        }
        monthsToShow.push(monthKey)
      }
    } else if (timeRange === '90d') {
      // Show last 3 months by grouping days
      for (let i = 89; i >= 0; i -= 3) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        const monthKey = date.toISOString().split('T')[0]
        monthlyData[monthKey] = { 
          month: date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }), 
          revenue: 0, 
          sales: 0, 
          purchases: 0 
        }
        monthsToShow.push(monthKey)
      }
    } else {
      // Show 12 months of current year
      for (let month = 0; month < 12; month++) {
        const date = new Date(currentYear, month, 1)
        const monthKey = date.toISOString().split('T')[0]
        monthlyData[monthKey] = { 
          month: date.toLocaleDateString('fr-FR', { month: 'long' }), 
          revenue: 0, 
          sales: 0, 
          purchases: 0 
        }
        monthsToShow.push(monthKey)
      }
    }
    
    // Process sales data
    sales.forEach(sale => {
      const saleDate = new Date(sale.date)
      let targetKey = ''
      
      if (timeRange === '1y') {
        // Group by month for yearly view
        const monthKey = new Date(saleDate.getFullYear(), saleDate.getMonth(), 1).toISOString().split('T')[0]
        targetKey = monthKey
      } else {
        // Use exact date for shorter periods
        const dateKey = saleDate.toISOString().split('T')[0]
        targetKey = dateKey
      }
      
      if (monthlyData[targetKey]) {
        monthlyData[targetKey].revenue += sale.total_revenue
        monthlyData[targetKey].sales += sale.quantity_sold
      }
    })
    
    // Process movements data
    movements.forEach(movement => {
      const movementDate = new Date(movement.date)
      let targetKey = ''
      
      if (timeRange === '1y') {
        // Group by month for yearly view
        const monthKey = new Date(movementDate.getFullYear(), movementDate.getMonth(), 1).toISOString().split('T')[0]
        targetKey = monthKey
      } else {
        // Use exact date for shorter periods
        const dateKey = movementDate.toISOString().split('T')[0]
        targetKey = dateKey
      }
      
      if (monthlyData[targetKey] && movement.movement_type === 'purchase') {
        monthlyData[targetKey].purchases += movement.quantity
      }
    })
    
    return monthsToShow.map(key => monthlyData[key]).filter(Boolean)
  }, [sales, movements, timeRange])

  // Calculate trends
  const trends = useMemo(() => {
    if (chartData.length < 2) return { revenue: 0, sales: 0, purchases: 0 }
    
    const recent = chartData.slice(-7)
    const previous = chartData.slice(-14, -7)
    
    const recentAvg = {
      revenue: recent.reduce((sum, item) => sum + item.revenue, 0) / recent.length,
      sales: recent.reduce((sum, item) => sum + item.sales, 0) / recent.length,
      purchases: recent.reduce((sum, item) => sum + item.purchases, 0) / recent.length
    }
    
    const previousAvg = {
      revenue: previous.reduce((sum, item) => sum + item.revenue, 0) / previous.length,
      sales: previous.reduce((sum, item) => sum + item.sales, 0) / previous.length,
      purchases: previous.reduce((sum, item) => sum + item.purchases, 0) / previous.length
    }
    
    return {
      revenue: previousAvg.revenue > 0 ? ((recentAvg.revenue - previousAvg.revenue) / previousAvg.revenue) * 100 : 0,
      sales: previousAvg.sales > 0 ? ((recentAvg.sales - previousAvg.sales) / previousAvg.sales) * 100 : 0,
      purchases: previousAvg.purchases > 0 ? ((recentAvg.purchases - previousAvg.purchases) / previousAvg.purchases) * 100 : 0
    }
  }, [chartData])

  // Top selling items
  const topSellingItems = useMemo(() => {
    const itemSales: { [key: string]: { name: string; revenue: number; quantity: number } } = {}
    
    sales.forEach(sale => {
      const key = sale.stock.reference
      if (!itemSales[key]) {
        itemSales[key] = { name: sale.stock.name, revenue: 0, quantity: 0 }
      }
      itemSales[key].revenue += sale.total_revenue
      itemSales[key].quantity += sale.quantity_sold
    })
    
    return Object.entries(itemSales)
      .map(([ref, data]) => ({ reference: ref, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
  }, [sales])

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
        <Button onClick={handleRefresh} className="ml-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Réessayer
        </Button>
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="mt-2 text-gray-600">
          Vue d'ensemble de votre gestion de stock et de vos performances
        </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
            <option value="90d">90 derniers jours</option>
            <option value="1y">1 an</option>
          </select>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
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
            <div className="flex items-center text-xs text-muted-foreground">
              Articles en stock
              {trends.purchases !== 0 && (
                <span className={`ml-2 flex items-center ${
                  trends.purchases > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {trends.purchases > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(trends.purchases).toFixed(1)}%
                </span>
              )}
            </div>
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
            <div className="flex items-center text-xs text-muted-foreground">
              Total des ventes
              {trends.revenue !== 0 && (
                <span className={`ml-2 flex items-center ${
                  trends.revenue > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {trends.revenue > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(trends.revenue).toFixed(1)}%
                </span>
              )}
            </div>
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
            <CardTitle>Évolution des revenus</CardTitle>
            <CardDescription>
              Chiffre d'affaires {timeRange === '7d' ? 'sur 7 jours' : timeRange === '30d' ? 'sur 30 jours' : timeRange === '90d' ? 'sur 3 mois' : 'par mois sur 1 an'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [
                    formatCurrency(Number(value)),
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
              Nombre de ventes {timeRange === '7d' ? 'sur 7 jours' : timeRange === '30d' ? 'sur 30 jours' : timeRange === '90d' ? 'sur 3 mois' : 'par mois sur 1 an'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
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

      {/* Additional Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Top Ventes</CardTitle>
            <CardDescription>
              Meilleurs articles vendus
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topSellingItems.length === 0 ? (
                <p className="text-sm text-gray-500">Aucune vente enregistrée</p>
              ) : (
                topSellingItems.map((item, index) => (
                  <div key={item.reference} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{item.reference}</div>
                        <div className="text-xs text-gray-500">{item.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatCurrency(item.revenue)}</div>
                      <div className="text-xs text-gray-500">{item.quantity} unités</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition des mouvements</CardTitle>
            <CardDescription>
              Achats vs Ventes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Achats', value: movements.filter(m => m.movement_type === 'purchase').length, color: '#10b981' },
                    { name: 'Ventes', value: movements.filter(m => m.movement_type === 'sale').length, color: '#ef4444' }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {[
                    { name: 'Achats', value: movements.filter(m => m.movement_type === 'purchase').length, color: '#10b981' },
                    { name: 'Ventes', value: movements.filter(m => m.movement_type === 'sale').length, color: '#ef4444' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center space-x-4 mt-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm">Achats</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span className="text-sm">Ventes</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mouvements récents</CardTitle>
            <CardDescription>
              Dernières activités
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {movements.slice(0, 5).length === 0 ? (
                <p className="text-sm text-gray-500">Aucun mouvement récent</p>
              ) : (
                movements.slice(0, 5).map(movement => (
                  <div key={movement.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-3 ${
                        movement.movement_type === 'purchase' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <div className="text-sm font-medium">{movement.stock.reference}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(movement.date).toLocaleDateString('fr-FR', { 
                            day: '2-digit', 
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        movement.movement_type === 'purchase' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {movement.movement_type === 'purchase' ? '+' : '-'}{movement.quantity}
                      </div>
                      <div className="text-xs text-gray-500">
                        {movement.movement_type === 'purchase' ? 'Achat' : 'Vente'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
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
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Mouvements totaux:</span>
              <span className="font-medium">{movements.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Dernière mise à jour:</span>
              <span className="font-medium">
                {new Date().toLocaleTimeString('fr-FR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions rapides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => {
                console.log('Navigation vers /stock')
                navigate('/stock')
              }}
              variant="outline"
              className="w-full justify-start h-auto p-3"
            >
              <div className="flex items-center w-full">
                <Plus className="h-4 w-4 mr-2 text-blue-600" />
                <div className="text-left">
              <div className="font-medium">Ajouter un article</div>
              <div className="text-sm text-gray-600">Créer un nouvel article en stock</div>
                </div>
              </div>
            </Button>
            <Button 
              onClick={() => {
                console.log('Navigation vers /movements')
                navigate('/movements')
              }}
              variant="outline"
              className="w-full justify-start h-auto p-3"
            >
              <div className="flex items-center w-full">
                <ShoppingCart className="h-4 w-4 mr-2 text-green-600" />
                <div className="text-left">
              <div className="font-medium">Enregistrer une vente</div>
              <div className="text-sm text-gray-600">Vendre des articles du stock</div>
                </div>
              </div>
            </Button>
            <Button 
              onClick={() => {
                console.log('Navigation vers /reports')
                navigate('/reports')
              }}
              variant="outline"
              className="w-full justify-start h-auto p-3"
            >
              <div className="flex items-center w-full">
                <BarChart3 className="h-4 w-4 mr-2 text-purple-600" />
                <div className="text-left">
              <div className="font-medium">Voir les rapports</div>
              <div className="text-sm text-gray-600">Analyser les performances</div>
                </div>
              </div>
            </Button>
            <Button 
              onClick={() => {
                console.log('Navigation vers /finance')
                navigate('/finance')
              }}
              variant="outline"
              className="w-full justify-start h-auto p-3"
            >
              <div className="flex items-center w-full">
                <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                <div className="text-left">
                  <div className="font-medium">Voir les finances</div>
                  <div className="text-sm text-gray-600">Consulter les données financières</div>
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}




