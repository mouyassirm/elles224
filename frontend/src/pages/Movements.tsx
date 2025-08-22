import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Move, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

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

export default function Movements() {
  const [stocks, setStocks] = useState<StockItem[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Purchase form state
  const [purchaseForm, setPurchaseForm] = useState({
    stock_id: '',
    quantity: 1
  })

  // Sale form state
  const [saleForm, setSaleForm] = useState({
    stock_id: '',
    quantity: 1,
    discount_percent: 0
  })

  // Summary metrics
  const summary = {
    totalMovements: movements.length,
    purchases: movements.filter(m => m.movement_type === 'purchase').length,
    sales: movements.filter(m => m.movement_type === 'sale').length
  }

  const fetchStocks = async () => {
    try {
      const res = await fetch('/api/stock')
      if (!res.ok) throw new Error('Impossible de charger les articles')
      const data = await res.json()
      setStocks(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement des articles')
    }
  }

  const fetchMovements = async () => {
    try {
      const res = await fetch('/api/movements')
      if (!res.ok) throw new Error('Impossible de charger les mouvements')
      const data = await res.json()
      setMovements(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement des mouvements')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStocks()
    fetchMovements()
  }, [])

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!purchaseForm.stock_id || purchaseForm.quantity <= 0) return

    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/movements/purchase?stock_id=${purchaseForm.stock_id}&quantity=${purchaseForm.quantity}`, {
        method: 'POST'
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail || 'Échec de l\'enregistrement de l\'achat')
      }
      
      // Reset form and refresh data
      setPurchaseForm({ stock_id: '', quantity: 1 })
      await Promise.all([fetchStocks(), fetchMovements()])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSale = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!saleForm.stock_id || saleForm.quantity <= 0) return

    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/movements/sale?stock_id=${saleForm.stock_id}&quantity=${saleForm.quantity}&discount_percent=${saleForm.discount_percent}`, {
        method: 'POST'
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail || 'Échec de l\'enregistrement de la vente')
      }
      
      // Reset form and refresh data
      setSaleForm({ stock_id: '', quantity: 1, discount_percent: 0 })
      await Promise.all([fetchStocks(), fetchMovements()])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStockById = (id: number) => stocks.find(s => s.id === id)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Mouvements</h1>
          <p className="mt-2 text-gray-600">
            Enregistrez les achats et ventes de stock
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Movement Summary */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Mouvements</CardTitle>
            <Move className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalMovements}</div>
            <p className="text-xs text-muted-foreground">
              Mouvements enregistrés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Achats</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.purchases}</div>
            <p className="text-xs text-muted-foreground">
              Articles achetés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventes</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.sales}</div>
            <p className="text-xs text-muted-foreground">
              Articles vendus
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Enregistrer un achat</CardTitle>
            <CardDescription>
              Ajouter des articles au stock
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePurchase} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Article
                </label>
                <select 
                  required
                  value={purchaseForm.stock_id}
                  onChange={(e) => setPurchaseForm(f => ({ ...f, stock_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un article</option>
                  {stocks.map(stock => (
                    <option key={stock.id} value={stock.id}>
                      {stock.reference} - {stock.name} (Stock: {stock.quantity})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantité
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  value={purchaseForm.quantity}
                  onChange={(e) => setPurchaseForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Quantité à ajouter"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting || !purchaseForm.stock_id}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer l\'achat'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enregistrer une vente</CardTitle>
            <CardDescription>
              Vendre des articles du stock
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSale} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Article
                </label>
                <select 
                  required
                  value={saleForm.stock_id}
                  onChange={(e) => setSaleForm(f => ({ ...f, stock_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un article</option>
                  {stocks.filter(s => s.quantity > 0).map(stock => (
                    <option key={stock.id} value={stock.id}>
                      {stock.reference} - {stock.name} (Stock: {stock.quantity})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantité
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  value={saleForm.quantity}
                  onChange={(e) => setSaleForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Quantité à vendre"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remise (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={saleForm.discount_percent}
                  onChange={(e) => setSaleForm(f => ({ ...f, discount_percent: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting || !saleForm.stock_id}
              >
                <TrendingDown className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer la vente'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Recent Movements */}
      <Card>
        <CardHeader>
          <CardTitle>Mouvements récents</CardTitle>
          <CardDescription>
            Historique des derniers mouvements de stock
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Date</th>
                  <th className="text-left py-3 px-4 font-medium">Article</th>
                  <th className="text-left py-3 px-4 font-medium">Type</th>
                  <th className="text-left py-3 px-4 font-medium">Quantité</th>
                  <th className="text-left py-3 px-4 font-medium">Remise</th>
                  <th className="text-left py-3 px-4 font-medium">Prix unitaire</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr className="border-b">
                    <td className="py-4 px-4 text-gray-500" colSpan={6}>Chargement...</td>
                  </tr>
                )}
                {!loading && movements.length === 0 && (
                  <tr className="border-b">
                    <td className="py-4 px-4 text-gray-500" colSpan={6}>Aucun mouvement</td>
                  </tr>
                )}
                {!loading && movements.map(movement => (
                  <tr key={movement.id} className="border-b">
                    <td className="py-3 px-4">
                      {new Date(movement.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-4">
                      {movement.stock.reference} - {movement.stock.name}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        movement.movement_type === 'purchase' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {movement.movement_type === 'purchase' ? 'Achat' : 'Vente'}
                      </span>
                    </td>
                    <td className="py-3 px-4">{movement.quantity}</td>
                    <td className="py-3 px-4">
                      {movement.discount_percent > 0 ? `${movement.discount_percent}%` : '-'}
                    </td>
                    <td className="py-3 px-4">{formatCurrency(movement.stock.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


