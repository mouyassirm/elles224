import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Unauthorized() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-600">Accès Refusé</CardTitle>
          <CardDescription>
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600 mb-6">
            Contactez votre administrateur si vous pensez qu'il s'agit d'une erreur.
          </p>
          <Button onClick={() => navigate('/dashboard')} className="w-full">
            <Home className="h-4 w-4 mr-2" />
            Retour au tableau de bord
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}




