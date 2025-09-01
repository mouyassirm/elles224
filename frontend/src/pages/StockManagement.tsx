import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Package, Search, Edit, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function StockManagement() {
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [stocks, setStocks] = useState<Array<{
    id: number
    reference: string
    name: string
    quantity: number
    unit_price: number
    total_value: number
  }>>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedStock, setSelectedStock] = useState<typeof stocks[0] | null>(null)

  const [form, setForm] = useState({
    reference: '',
    name: '',
    quantity: 0,
    unit_price: 0,
  })

  const [editForm, setEditForm] = useState({
    name: '',
    quantity: 0,
    unit_price: 0,
  })

  const filteredStocks = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return stocks
    return stocks.filter(s =>
      s.reference.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    )
  }, [stocks, search])

  const summary = useMemo(() => {
    const totalItems = stocks.length
    const totalValue = stocks.reduce((acc, s) => acc + (s.total_value || 0), 0)
    const lowStock = stocks.filter(s => s.quantity < 10).length
    return { totalItems, totalValue, lowStock }
  }, [stocks])

  const fetchStocks = async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const res = await fetch('/api/stock')
      if (!res.ok) throw new Error('Impossible de charger les articles')
      const data = await res.json()
      setStocks(data)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStocks()
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: form.reference.trim(),
          name: form.name.trim(),
          quantity: Number(form.quantity) || 0,
          unit_price: Number(form.unit_price) || 0,
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail || 'Échec de la création')
      }
      setForm({ reference: '', name: '', quantity: 0, unit_price: 0 })
      setShowCreate(false)
      await fetchStocks()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStock) return
    
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch(`/api/stock/${selectedStock.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          quantity: Number(editForm.quantity) || 0,
          unit_price: Number(editForm.unit_price) || 0,
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail || 'Échec de la modification')
      }
      setShowEdit(false)
      setSelectedStock(null)
      await fetchStocks()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onDelete = async () => {
    if (!selectedStock) return
    
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch(`/api/stock/${selectedStock.id}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail || 'Échec de la suppression')
      }
      setShowDelete(false)
      setSelectedStock(null)
      await fetchStocks()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEdit = (stock: typeof stocks[0]) => {
    setSelectedStock(stock)
    setEditForm({
      name: stock.name,
      quantity: stock.quantity,
      unit_price: stock.unit_price,
    })
    setShowEdit(true)
  }

  const openDelete = (stock: typeof stocks[0]) => {
    setSelectedStock(stock)
    setShowDelete(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion du Stock</h1>
          <p className="mt-2 text-gray-600">
            Gérez vos articles, quantités et prix
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un article
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Nouvel article</CardTitle>
            <CardDescription>Renseignez les informations de l'article</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Référence</label>
                  <input
                    required
                    value={form.reference}
                    onChange={(e) => setForm(f => ({ ...f, reference: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Nom</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Quantité</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={form.quantity}
                    onChange={(e) => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Prix unitaire</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    required
                    value={form.unit_price}
                    onChange={(e) => setForm(f => ({ ...f, unit_price: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              {submitError && (
                <div className="text-sm text-red-600">{submitError}</div>
              )}
              <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowCreate(false)} disabled={isSubmitting}>
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showEdit && selectedStock && (
        <Card>
          <CardHeader>
            <CardTitle>Modifier l'article</CardTitle>
            <CardDescription>Modifiez les informations de l'article {selectedStock.reference}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Référence</label>
                  <input
                    disabled
                    value={selectedStock.reference}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Nom</label>
                  <input
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Quantité</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editForm.quantity}
                    onChange={(e) => setEditForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Prix unitaire</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    required
                    value={editForm.unit_price}
                    onChange={(e) => setEditForm(f => ({ ...f, unit_price: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              {submitError && (
                <div className="text-sm text-red-600">{submitError}</div>
              )}
              <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Modification...' : 'Modifier'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowEdit(false)} disabled={isSubmitting}>
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showDelete && selectedStock && (
        <Card>
          <CardHeader>
            <CardTitle>Confirmer la suppression</CardTitle>
            <CardDescription>Êtes-vous sûr de vouloir supprimer cet article ?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800">
                  <strong>Article:</strong> {selectedStock.reference} - {selectedStock.name}
                </p>
                <p className="text-red-600 text-sm mt-1">
                  Cette action est irréversible.
                </p>
              </div>
              {submitError && (
                <div className="text-sm text-red-600">{submitError}</div>
              )}
              <div className="flex gap-3">
                <Button 
                  variant="destructive" 
                  onClick={onDelete} 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Suppression...' : 'Supprimer définitivement'}
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => setShowDelete(false)} 
                  disabled={isSubmitting}
                >
                  Annuler
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Recherche et filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un article..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Tous les articles</option>
              <option value="low">Stock faible</option>
              <option value="out">Rupture de stock</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Stock Summary */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalItems}</div>
            <p className="text-xs text-muted-foreground">
              Articles en stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur Totale</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalValue)}</div>
            <p className="text-xs text-muted-foreground">
              Valeur du stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Faible</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{summary.lowStock}</div>
            <p className="text-xs text-muted-foreground">
              À réapprovisionner
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des articles</CardTitle>
          <CardDescription>
            Tous les articles en stock avec leurs détails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Référence</th>
                  <th className="text-left py-3 px-4 font-medium">Nom</th>
                  <th className="text-left py-3 px-4 font-medium">Quantité</th>
                  <th className="text-left py-3 px-4 font-medium">Prix unitaire</th>
                  <th className="text-left py-3 px-4 font-medium">Valeur totale</th>
                  <th className="text-left py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr className="border-b">
                    <td className="py-4 px-4 text-gray-500" colSpan={6}>Chargement...</td>
                  </tr>
                )}
                {loadError && (
                  <tr className="border-b">
                    <td className="py-4 px-4 text-red-600" colSpan={6}>{loadError}</td>
                  </tr>
                )}
                {!loading && !loadError && filteredStocks.length === 0 && (
                  <tr className="border-b">
                    <td className="py-4 px-4 text-gray-500" colSpan={6}>Aucun article</td>
                  </tr>
                )}
                {!loading && !loadError && filteredStocks.map(item => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3 px-4">{item.reference}</td>
                    <td className="py-3 px-4">{item.name}</td>
                    <td className="py-3 px-4">{item.quantity}</td>
                    <td className="py-3 px-4">{formatCurrency(item.unit_price)}</td>
                    <td className="py-3 px-4">{formatCurrency(item.total_value)}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(item)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDelete(item)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
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




          <CardContent>

            <div className="text-2xl font-bold">0,00 €</div>

            <p className="text-xs text-muted-foreground">

              Valeur du stock

            </p>

          </CardContent>

        </Card>



        <Card>

          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">

            <CardTitle className="text-sm font-medium">Stock Faible</CardTitle>

            <Package className="h-4 w-4 text-muted-foreground" />

          </CardHeader>

          <CardContent>

            <div className="text-2xl font-bold text-orange-600">0</div>

            <p className="text-xs text-muted-foreground">

              À réapprovisionner

            </p>

          </CardContent>

        </Card>

      </div>



      {/* Stock Table */}

      <Card>

        <CardHeader>

          <CardTitle>Liste des articles</CardTitle>

          <CardDescription>

            Tous les articles en stock avec leurs détails

          </CardDescription>

        </CardHeader>

        <CardContent>

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead>

                <tr className="border-b">

                  <th className="text-left py-3 px-4 font-medium">Référence</th>

                  <th className="text-left py-3 px-4 font-medium">Nom</th>

                  <th className="text-left py-3 px-4 font-medium">Quantité</th>

                  <th className="text-left py-3 px-4 font-medium">Prix unitaire</th>

                  <th className="text-left py-3 px-4 font-medium">Valeur totale</th>

                  <th className="text-left py-3 px-4 font-medium">Actions</th>

                </tr>

              </thead>

              <tbody>

                <tr className="border-b">

                  <td className="py-4 px-4 text-gray-500">Aucun article</td>

                  <td className="py-4 px-4 text-gray-500">-</td>

                  <td className="py-4 px-4 text-gray-500">-</td>

                  <td className="py-4 px-4 text-gray-500">-</td>

                  <td className="py-4 px-4 text-gray-500">-</td>

                  <td className="py-4 px-4 text-gray-500">-</td>

                </tr>

              </tbody>

            </table>

          </div>

        </CardContent>

      </Card>

    </div>

  )

}






