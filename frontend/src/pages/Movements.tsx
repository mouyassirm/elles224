import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, Package, Calendar, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Stock {
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
  movement_type: 'purchase' | 'sale'
  quantity: number
  discount_percent: number
  stock: Stock
}

export default function Movements() {
  const [stocks, setStocks] = useState<Stock[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form states
  const [purchaseForm, setPurchaseForm] = useState({
    stock_id: 0,
    quantity: 0
  })
  
  const [saleForm, setSaleForm] = useState({
    stock_id: 0,
    quantity: 0,
    discount_percent: 0
  })

  // Fetch stocks and movements
  const fetchStocks = async () => {
    try {
      const res = await fetch('/api/stock')
      if (!res.ok) throw new Error('Erreur lors du chargement des articles')
      const data = await res.json()
      setStocks(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement')
    }
  }

  const fetchMovements = async () => {
    try {
      const res = await fetch('/api/movements?limit=50')
      if (!res.ok) throw new Error('Erreur lors du chargement des mouvements')
      const data = await res.json()
      setMovements(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement')
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      await Promise.all([fetchStocks(), fetchMovements()])
      setLoading(false)
    }
    loadData()
  }, [])

  // Helper functions
  const getStockById = (id: number) => stocks.find(s => s.id === id)
  const getAvailableQuantity = (stockId: number) => getStockById(stockId)?.quantity || 0

  // Validation functions
  const validatePurchase = () => {
    if (purchaseForm.stock_id === 0) {
      setError('Veuillez sélectionner un article')
      return false
    }
    if (purchaseForm.quantity <= 0) {
      setError('La quantité doit être supérieure à 0')
      return false
    }
    return true
  }

  const validateSale = () => {
    if (saleForm.stock_id === 0) {
      setError('Veuillez sélectionner un article')
      return false
    }
    if (saleForm.quantity <= 0) {
      setError('La quantité doit être supérieure à 0')
      return false
    }
    const available = getAvailableQuantity(saleForm.stock_id)
    if (saleForm.quantity > available) {
      setError(`Stock insuffisant. Disponible: ${available}, Demandé: ${saleForm.quantity}`)
      return false
    }
    if (saleForm.discount_percent < 0 || saleForm.discount_percent > 100) {
      setError('La remise doit être entre 0 et 100%')
      return false
    }
    return true
  }

  // Handle purchase
  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!validatePurchase()) return
    
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/movements/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock_id: purchaseForm.stock_id,
          quantity: purchaseForm.quantity
        })
      })
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail || 'Erreur lors de l\'achat')
      }
      
      // Reset form and refresh data
      setPurchaseForm({ stock_id: 0, quantity: 0 })
      await Promise.all([fetchStocks(), fetchMovements()])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle sale
  const handleSale = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!validateSale()) return
    
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/movements/sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock_id: saleForm.stock_id,
          quantity: saleForm.quantity,
          discount_percent: saleForm.discount_percent
        })
      })
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail || 'Erreur lors de la vente')
      }
      
      // Reset form and refresh data
      setSaleForm({ stock_id: 0, quantity: 0, discount_percent: 0 })
      await Promise.all([fetchStocks(), fetchMovements()])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate KPIs
  const kpis = {
    totalMovements: movements.length,
    totalPurchases: movements.filter(m => m.movement_type === 'purchase').length,
    totalSales: movements.filter(m => m.movement_type === 'sale').length,
    totalRevenue: movements
      .filter(m => m.movement_type === 'sale')
      .reduce((acc, m) => {
        const unitPrice = m.stock.unit_price
        const discountAmount = unitPrice * (m.discount_percent / 100)
        const finalPrice = unitPrice - discountAmount
        return acc + (finalPrice * m.quantity)
      }, 0)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-500">Chargement...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mouvements de Stock</h1>
          <p className="mt-2 text-gray-600">
            Enregistrez les achats et ventes d'articles
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center text-red-800">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Mouvements</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalMovements}</div>
            <p className="text-xs text-muted-foreground">
              Tous les mouvements
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Achats</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{kpis.totalPurchases}</div>
            <p className="text-xs text-muted-foreground">
              Entrées en stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventes</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{kpis.totalSales}</div>
            <p className="text-xs text-muted-foreground">
              Sorties de stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'Affaires</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Revenus des ventes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Forms */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Purchase Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
              Acheter des articles
            </CardTitle>
            <CardDescription>
              Enregistrer l'arrivée de nouveaux articles en stock
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePurchase} className="space-y-4">
            <div>
                <label className="block text-sm text-gray-700 mb-1">Article</label>
                <select
                  required
                  value={purchaseForm.stock_id}
                  onChange={(e) => setPurchaseForm(f => ({ ...f, stock_id: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>Sélectionner un article</option>
                  {stocks.map(stock => (
                    <option key={stock.id} value={stock.id}>
                      {stock.reference} - {stock.name} (Stock: {stock.quantity})
                    </option>
                  ))}
              </select>
            </div>
              
            <div>
                <label className="block text-sm text-gray-700 mb-1">Quantité à ajouter</label>
              <input
                type="number"
                min="1"
                  required
                  value={purchaseForm.quantity}
                  onChange={(e) => setPurchaseForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

              {purchaseForm.stock_id > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">
                    <strong>Stock actuel:</strong> {getAvailableQuantity(purchaseForm.stock_id)} unités
                  </p>
                  <p className="text-sm text-green-700">
                    <strong>Nouveau stock:</strong> {getAvailableQuantity(purchaseForm.stock_id) + purchaseForm.quantity} unités
                  </p>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
              <TrendingUp className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer l\'achat'}
            </Button>
            </form>
          </CardContent>
        </Card>

        {/* Sale Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingDown className="h-5 w-5 mr-2 text-red-600" />
              Vendre des articles
            </CardTitle>
            <CardDescription>
              Enregistrer la sortie d'articles du stock
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSale} className="space-y-4">
            <div>
                <label className="block text-sm text-gray-700 mb-1">Article</label>
                <select
                  required
                  value={saleForm.stock_id}
                  onChange={(e) => setSaleForm(f => ({ ...f, stock_id: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>Sélectionner un article</option>
                  {stocks.filter(stock => stock.quantity > 0).map(stock => (
                    <option key={stock.id} value={stock.id}>
                      {stock.reference} - {stock.name} (Stock: {stock.quantity})
                    </option>
                  ))}
              </select>
            </div>
              
            <div>
                <label className="block text-sm text-gray-700 mb-1">Quantité à vendre</label>
              <input
                type="number"
                min="1"
                  max={saleForm.stock_id > 0 ? getAvailableQuantity(saleForm.stock_id) : 0}
                  required
                  value={saleForm.quantity}
                  onChange={(e) => setSaleForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
                <label className="block text-sm text-gray-700 mb-1">Remise (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                  value={saleForm.discount_percent}
                  onChange={(e) => setSaleForm(f => ({ ...f, discount_percent: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

              {saleForm.stock_id > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Stock disponible:</strong> {getAvailableQuantity(saleForm.stock_id)} unités
                  </p>
                  <p className="text-sm text-blue-700">
                    <strong>Stock restant:</strong> {getAvailableQuantity(saleForm.stock_id) - saleForm.quantity} unités
                  </p>
                  {saleForm.quantity > 0 && (
                    <p className="text-sm text-blue-700">
                      <strong>Prix unitaire:</strong> {formatCurrency(getStockById(saleForm.stock_id)?.unit_price || 0)}
                    </p>
                  )}
                  {saleForm.quantity > 0 && saleForm.discount_percent > 0 && (
                    <p className="text-sm text-blue-700">
                      <strong>Prix après remise:</strong> {formatCurrency(
                        (getStockById(saleForm.stock_id)?.unit_price || 0) * (1 - saleForm.discount_percent / 100)
                      )}
                    </p>
                  )}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
              <TrendingDown className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer la vente'}
            </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Recent Movements Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Mouvements Récents
          </CardTitle>
          <CardDescription>
            Historique des 50 derniers mouvements
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
                  <th className="text-left py-3 px-4 font-medium">Prix unitaire</th>
                  <th className="text-left py-3 px-4 font-medium">Remise</th>
                  <th className="text-left py-3 px-4 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                <tr className="border-b">
                    <td className="py-4 px-4 text-gray-500" colSpan={7}>
                      Aucun mouvement enregistré
                    </td>
                  </tr>
                ) : (
                  movements.map(movement => {
                    const unitPrice = movement.stock.unit_price
                    const discountAmount = unitPrice * (movement.discount_percent / 100)
                    const finalPrice = unitPrice - discountAmount
                    const total = finalPrice * movement.quantity
                    
                    return (
                      <tr key={movement.id} className="border-b">
                        <td className="py-3 px-4">
                          {new Date(movement.date).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">{movement.stock.reference}</div>
                            <div className="text-sm text-gray-500">{movement.stock.name}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            movement.movement_type === 'purchase' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {movement.movement_type === 'purchase' ? 'Achat' : 'Vente'}
                          </span>
                        </td>
                        <td className="py-3 px-4">{movement.quantity}</td>
                        <td className="py-3 px-4">{formatCurrency(unitPrice)}</td>
                        <td className="py-3 px-4">
                          {movement.discount_percent > 0 ? `${movement.discount_percent}%` : '-'}
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {movement.movement_type === 'sale' ? formatCurrency(total) : '-'}
                        </td>
                </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}



