import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TrendingUp, Download, RefreshCw, AlertTriangle, DollarSign, Package } from 'lucide-react'

interface PerformanceMetrics {
  total_stock_value: number
  monthly_revenue: number
  monthly_movements: number
  average_discount: number
  stock_turnover_rate: number
  items_sold_this_month: number
}

interface StockAlert {
  id: number
  name: string
  quantity: number
  threshold: number
}

interface ReportHistory {
  id: string
  type: string
  period: string
  format: string
  generated_at: string
}

export default function Reports() {
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [alerts, setAlerts] = useState<StockAlert[]>([])
  const [reportHistory, setReportHistory] = useState<ReportHistory[]>([])
  const [selectedReportType, setSelectedReportType] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [selectedFormat, setSelectedFormat] = useState('pdf')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  useEffect(() => {
    fetchReportsData()
  }, [])

  const fetchReportsData = async () => {
    try {
      setLoading(true)
      
      // Fetch performance metrics
      const metricsResponse = await fetch('/api/reports/performance/metrics')
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json()
        setMetrics(metricsData)
      }

      // Fetch stock alerts
      const alertsResponse = await fetch('/api/reports/stock/quantity-alerts?threshold=10')
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json()
        setAlerts(alertsData.alerts || [])
      }

      // Mock report history (in real app, this would come from backend)
      setReportHistory([
        {
          id: '1',
          type: 'Rapport de Stock',
          period: 'Ce mois',
          format: 'PDF',
          generated_at: new Date().toISOString()
        }
      ])

    } catch (error) {
      console.error('Error fetching reports data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async () => {
    if (!selectedReportType) {
      alert('Veuillez sélectionner un type de rapport')
      return
    }

    try {
      setGenerating(true)
      
      let url = ''
      let filename = ''
      
      switch (selectedReportType) {
        case 'stock':
          url = '/api/reports/pdf/stock'
          filename = `rapport_stock_${new Date().toISOString().split('T')[0]}.pdf`
          break
        case 'sales':
          let salesUrl = `/api/reports/pdf/sales?period=${selectedPeriod || 'month'}`
          
          // Add custom date parameters if period is custom
          if (selectedPeriod === 'custom') {
            if (!customStartDate || !customEndDate) {
              throw new Error('Veuillez sélectionner les dates de début et de fin')
            }
            salesUrl += `&start_date=${customStartDate}&end_date=${customEndDate}`
          }
          
          url = salesUrl
          filename = `rapport_ventes_${selectedPeriod || 'month'}_${new Date().toISOString().split('T')[0]}.pdf`
          break
        case 'financial':
          url = '/api/reports/pdf/financial'
          filename = `rapport_financier_${new Date().toISOString().split('T')[0]}.pdf`
          break
        default:
          throw new Error('Type de rapport non supporté')
      }

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Erreur lors de la génération du rapport')
      }

      // Download the PDF
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

      // Add to history
      const newReport: ReportHistory = {
        id: Date.now().toString(),
        type: getReportTypeName(selectedReportType),
        period: getPeriodName(selectedPeriod),
        format: selectedFormat.toUpperCase(),
        generated_at: new Date().toISOString()
      }
      setReportHistory(prev => [newReport, ...prev])

    } catch (error) {
      console.error('Error generating report:', error)
      alert('Erreur lors de la génération du rapport')
    } finally {
      setGenerating(false)
    }
  }

  const getReportTypeName = (type: string) => {
    switch (type) {
      case 'stock': return 'Rapport de Stock'
      case 'sales': return 'Rapport de Ventes'
      case 'financial': return 'Rapport Financier'
      default: return type
    }
  }

  const getPeriodName = (period: string) => {
    switch (period) {
      case 'week': return 'Cette semaine'
      case 'month': return 'Ce mois'
      case '3months': return '3 derniers mois'
      case '6months': return '6 derniers mois'
      case '9months': return '9 derniers mois'
      case 'year': return 'Cette année'
      case 'custom': return 'Période personnalisée'
      default: return 'Période personnalisée'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Chargement des rapports...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rapports et Analyses</h1>
          <p className="mt-2 text-gray-600">
            Analysez vos performances et générez des rapports PDF
          </p>
        </div>
        <Button 
          onClick={fetchReportsData}
          variant="outline"
          className="flex items-center"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Performance Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Métriques de performance
              </CardTitle>
              <CardDescription>
                Indicateurs clés de performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Valeur du stock</span>
                <span className="font-medium">{formatCurrency(metrics.total_stock_value)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Revenus mensuels</span>
                <span className="font-medium">{formatCurrency(metrics.monthly_revenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Rotation du stock</span>
                <span className="font-medium">{metrics.stock_turnover_rate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Remise moyenne</span>
                <span className="font-medium">{metrics.average_discount.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Articles vendus ce mois</span>
                <span className="font-medium">{metrics.items_sold_this_month}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Alertes et notifications
              </CardTitle>
              <CardDescription>
                Points d'attention importants
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.length > 0 ? (
                  alerts.map((alert) => (
                    <div key={alert.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                        <div>
                          <p className="font-medium text-yellow-800">{alert.name}</p>
                          <p className="text-sm text-yellow-600">
                            Stock faible: {alert.quantity} (seuil: {alert.threshold})
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    Aucune alerte active
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Génération de rapports PDF</CardTitle>
          <CardDescription>
            Créez et téléchargez des rapports selon vos besoins
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`grid grid-cols-1 gap-4 ${selectedPeriod === 'custom' ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de rapport
              </label>
              <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock">Rapport de Stock</SelectItem>
                  <SelectItem value="sales">Rapport de Ventes</SelectItem>
                  <SelectItem value="financial">Rapport Financier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Période
              </Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Cette semaine</SelectItem>
                  <SelectItem value="month">Ce mois</SelectItem>
                  <SelectItem value="3months">3 derniers mois</SelectItem>
                  <SelectItem value="6months">6 derniers mois</SelectItem>
                  <SelectItem value="9months">9 derniers mois</SelectItem>
                  <SelectItem value="year">Cette année</SelectItem>
                  <SelectItem value="custom">Période personnalisée</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Custom date inputs - only show when custom period is selected */}
            {selectedPeriod === 'custom' && (
              <>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de début
                  </Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomStartDate(e.target.value)}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de fin
                  </Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomEndDate(e.target.value)}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
              </>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Format d'export
              </label>
              <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={generateReport}
                disabled={generating || !selectedReportType}
                className="w-full"
              >
                {generating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Générer le rapport
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Report Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Rapport de stock
            </CardTitle>
            <CardDescription>
              État actuel du stock et alertes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Vue d'ensemble de tous les articles en stock avec leurs quantités et valeurs
            </p>
            <Button 
              onClick={() => {
                setSelectedReportType('stock')
                generateReport()
              }}
              disabled={generating}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Générer PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Rapport de ventes
            </CardTitle>
            <CardDescription>
              Analyse des performances de vente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Évolution des ventes, meilleurs vendeurs et tendances
            </p>
            <Button 
              onClick={() => {
                setSelectedReportType('sales')
                setSelectedPeriod('month')
                generateReport()
              }}
              disabled={generating}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Générer PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Rapport financier
            </CardTitle>
            <CardDescription>
              Synthèse financière complète
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Résumé financier des activités et performances
            </p>
            <Button 
              onClick={() => {
                setSelectedReportType('financial')
                generateReport()
              }}
              disabled={generating}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Générer PDF
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Report History */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des rapports</CardTitle>
          <CardDescription>
            Rapports générés précédemment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Date</th>
                  <th className="text-left py-3 px-4 font-medium">Type</th>
                  <th className="text-left py-3 px-4 font-medium">Période</th>
                  <th className="text-left py-3 px-4 font-medium">Format</th>
                  <th className="text-left py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reportHistory.length > 0 ? (
                  reportHistory.map((report) => (
                    <tr key={report.id} className="border-b">
                      <td className="py-4 px-4">{formatDate(report.generated_at)}</td>
                      <td className="py-4 px-4">{report.type}</td>
                      <td className="py-4 px-4">{report.period}</td>
                      <td className="py-4 px-4">{report.format}</td>
                      <td className="py-4 px-4">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Télécharger
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                <tr className="border-b">
                  <td className="py-4 px-4 text-gray-500">Aucun rapport</td>
                  <td className="py-4 px-4 text-gray-500">-</td>
                  <td className="py-4 px-4 text-gray-500">-</td>
                  <td className="py-4 px-4 text-gray-500">-</td>
                  <td className="py-4 px-4 text-gray-500">-</td>
                </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}