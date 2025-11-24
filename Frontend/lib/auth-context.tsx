'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { authAPI, userAPI } from './api'

interface User {
  _id: string
  nama_lengkap: string
  email: string
  peran: string
  alamat?: Array<{
    jalan: string
    kota: string
    kode_pos?: string
  }>
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: {
    nama_lengkap: string
    email: string
    password: string
    peran?: string
  }) => Promise<void>
  logout: () => void
  isAdmin: () => boolean
  isAuthenticated: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Load user data on mount
  useEffect(() => {
    const loadUser = async () => {
      if (typeof window === 'undefined') {
        setLoading(false)
        return
      }
      
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const userData = await userAPI.getCurrentUser()
          setUser(userData)
        } catch (error) {
          console.error('Failed to load user:', error)
          localStorage.removeItem('token')
        }
      }
      setLoading(false)
    }

    loadUser()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      await authAPI.login(email, password)
      const userData = await userAPI.getCurrentUser()
      setUser(userData)
      
      // Save user data to localStorage for quick access
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(userData))
      }
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  const register = async (data: {
    nama_lengkap: string
    email: string
    password: string
    peran?: string
  }) => {
    try {
      await authAPI.register(data)
      // Auto login after registration
      await login(data.email, data.password)
    } catch (error) {
      console.error('Registration failed:', error)
      throw error
    }
  }

  const logout = () => {
    authAPI.logout()
    setUser(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user')
    }
  }

  const isAdmin = () => {
    return user?.peran === 'admin'
  }

  const isAuthenticated = () => {
    return !!user
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAdmin,
        isAuthenticated,
      }}
    >
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
