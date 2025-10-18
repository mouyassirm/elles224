import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: number
  username: string
  role: string
  is_active: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (token: string, user: User) => void
  logout: () => void
  isAuthenticated: boolean
  isCEO: boolean
  isManager: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    // Check for stored auth data on mount
    const storedToken = localStorage.getItem('access_token')
    const storedUser = localStorage.getItem('user')
    
    if (storedToken && storedUser) {
      try {
        const userData = JSON.parse(storedUser)
        setToken(storedToken)
        setUser(userData)
      } catch (error) {
        // Clear invalid data
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
      }
    }
  }, [])

  const login = (newToken: string, newUser: User) => {
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem('access_token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
  }

  const isAuthenticated = !!token && !!user
  const isCEO = user?.role === 'ceo'
  const isManager = user?.role === 'manager'

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      isAuthenticated,
      isCEO,
      isManager
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}




