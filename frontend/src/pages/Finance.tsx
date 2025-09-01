import React, { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingUp, BarChart3, Calendar, TrendingDown } from 'lucide-react'

interface StockItem {
  id: number
  reference: string
  name: string
  quantity: number
  unit_price: number
  total_value: number
}

interface Movement {
  id: number
  date: string
  stock_id: number
  movement_type: 'purchase' | 'sale'
  quantity: number
  discount_percent: number
  stock: StockItem
}

interface FinancialMetrics {
  totalRevenue: number
  monthlyRevenue: number
  totalSales: number
  averageDiscount: number
  totalPurchases: number
  netCashFlow: number
}

export default function Finance() {
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })

  const fetchMovements = async () => {
    try {
      const res = await fetch('/api/movements')
      if (!res.ok) throw new Error('Impossible de charger les mouvements')
      const data = await res.json()
      setMovements(data)
    } catch (e) {
      console.error('Erreur de chargement des mouvements:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMovements()
  }, [])

  // Calculate financial metrics based on movements
  const calculateMetrics = (): FinancialMetrics => {
    const sales = movements.filter(m => m.movement_type === 'sale')
    const purchases = movements.filter(m => m.movement_type === 'purchase')
    
    // Filter by date range
    const filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.date)
      const start = new Date(dateRange.startDate)
      const end = new Date(dateRange.endDate)
      return saleDate >= start && saleDate <= end
    })

    const totalRevenue = filteredSales.reduce((sum, sale) => {
      const priceAfterDiscount = sale.stock.unit_price * (1 - sale.discount_percent / 100)
      return sum + (priceAfterDiscount * sale.quantity)
    }, 0)

    const monthlyRevenue = sales
      .filter(sale => {
        const saleDate = new Date(sale.date)
        const now = new Date()
        return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear()
      })
      .reduce((sum, sale) => {
        const priceAfterDiscount = sale.stock.unit_price * (1 - sale.discount_percent / 100)
        return sum + (priceAfterDiscount * sale.quantity)
      }, 0)

    const totalSales = filteredSales.length
    const totalPurchases = purchases.length

    const averageDiscount = filteredSales.length > 0 
      ? filteredSales.reduce((sum, sale) => sum + sale.discount_percent, 0) / filteredSales.length
      : 0

    // Calculate net cash flow (revenue - purchases)
    const totalPurchaseCost = purchases.reduce((sum, purchase) => {
      return sum + (purchase.stock.unit_price * purchase.quantity)
    }, 0)

    const netCashFlow = totalRevenue - totalPurchaseCost

    return {
      totalRevenue,
      monthlyRevenue,
      totalSales,
      averageDiscount,
      totalPurchases,
      netCashFlow
    }
  }

  const metrics = calculateMetrics()

  // Get sales for the table
  const getSalesForTable = () => {
    return movements
      .filter(m => m.movement_type === 'sale')
      .filter(sale => {
        const saleDate = new Date(sale.date)
        const start = new Date(dateRange.startDate)
        const end = new Date(dateRange.endDate)
        return saleDate >= start && saleDate <= end
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  // Get best sellers
  const getBestSellers = () => {
    const sales = movements.filter(m => m.movement_type === 'sale')
    const itemSales = new Map<string, { quantity: number; revenue: number }>()

    sales.forEach(sale => {
      const key = sale.stock.name
      const existing = itemSales.get(key) || { quantity: 0, revenue: 0 }
      const priceAfterDiscount = sale.stock.unit_price * (1 - sale.discount_percent / 100)
      
      itemSales.set(key, {
        quantity: existing.quantity + sale.quantity,
        revenue: existing.revenue + (priceAfterDiscount * sale.quantity)
      })
    })

    return Array.from(itemSales.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
  }

  const handleDateFilter = () => {
    // The metrics will automatically recalculate when dateRange changes
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gestion Financière</h1>
        <p className="mt-2 text-gray-600">
          Suivez vos ventes, revenus et performances financières en temps réel
        </p>
        <div className="mt-4">
          <button
            onClick={fetchMovements}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
          >
            {loading ? 'Chargement...' : '🔄 Actualiser les données'}
          </button>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Période sélectionnée
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventes du mois</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(metrics.monthlyRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Ce mois-ci
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total ventes</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSales}</div>
            <p className="text-xs text-muted-foreground">
              Nombre de ventes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flux de trésorerie</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(metrics.netCashFlow)}
            </div>
            <p className="text-xs text-muted-foreground">
              Revenus - Achats
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres de période</CardTitle>
          <CardDescription>
            Sélectionnez une période pour analyser vos performances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de début
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de fin
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button 
                onClick={handleDateFilter}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Filtrer
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des ventes</CardTitle>
          <CardDescription>
            Détail de toutes les ventes effectuées sur la période sélectionnée
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Date</th>
                  <th className="text-left py-3 px-4 font-medium">Article</th>
                  <th className="text-left py-3 px-4 font-medium">Quantité</th>
                  <th className="text-left py-3 px-4 font-medium">Prix unitaire</th>
                  <th className="text-left py-3 px-4 font-medium">Remise</th>
                  <th className="text-left py-3 px-4 font-medium">Prix final</th>
                  <th className="text-left py-3 px-4 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr className="border-b">
                    <td className="py-4 px-4 text-gray-500" colSpan={7}>Chargement...</td>
                  </tr>
                )}
                {!loading && getSalesForTable().length === 0 && (
                  <tr className="border-b">
                    <td className="py-4 px-4 text-gray-500" colSpan={7}>Aucune vente sur cette période</td>
                  </tr>
                )}
                {!loading && getSalesForTable().map(sale => {
                  const priceAfterDiscount = sale.stock.unit_price * (1 - sale.discount_percent / 100)
                  const total = priceAfterDiscount * sale.quantity
                  
                  return (
                    <tr key={sale.id} className="border-b">
                      <td className="py-3 px-4">
                        {new Date(sale.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-3 px-4">
                        {sale.stock.reference} - {sale.stock.name}
                      </td>
                      <td className="py-3 px-4">{sale.quantity}</td>
                      <td className="py-3 px-4">{formatCurrency(sale.stock.unit_price)}</td>
                      <td className="py-3 px-4">
                        {sale.discount_percent > 0 ? `${sale.discount_percent}%` : '-'}
                      </td>
                      <td className="py-3 px-4">{formatCurrency(priceAfterDiscount)}</td>
                      <td className="py-3 px-4 font-medium">{formatCurrency(total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Best Sellers */}
      <Card>
        <CardHeader>
          <CardTitle>Meilleurs vendeurs</CardTitle>
          <CardDescription>
            Articles les plus vendus par quantité
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {getBestSellers().length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                Aucune donnée de vente disponible
              </div>
            ) : (
              getBestSellers().map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-600">
                        {item.quantity} unités vendues
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      {formatCurrency(item.revenue)}
                    </div>
                    <p className="text-sm text-gray-600">Revenus totaux</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


