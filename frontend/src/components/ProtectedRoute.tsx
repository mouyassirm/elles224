import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'ceo' | 'manager'
  allowBoth?: boolean
}

export default function ProtectedRoute({ 
  children, 
  requiredRole, 
  allowBoth = false 
}: ProtectedRouteProps) {
  const { isAuthenticated, isCEO, isManager } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredRole) {
    if (requiredRole === 'ceo' && !isCEO) {
      return <Navigate to="/unauthorized" replace />
    }
    if (requiredRole === 'manager' && !isManager && !isCEO) {
      return <Navigate to="/unauthorized" replace />
    }
  }

  if (allowBoth && !isCEO && !isManager) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}



