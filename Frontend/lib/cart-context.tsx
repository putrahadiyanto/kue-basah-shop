'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export interface CartItem {
  id: number
  nama: string
  harga: number
  qty: number
  satuan: string
}

interface CartContextType {
  items: CartItem[]
  addToCart: (item: CartItem) => void
  removeFromCart: (id: number) => void
  updateQty: (id: number, qty: number) => void
  clearCart: () => void
  total: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [mounted, setMounted] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('cart')
    if (saved) {
      setItems(JSON.parse(saved))
    }
    setMounted(true)
  }, [])

  // Save to localStorage when items change
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('cart', JSON.stringify(items))
    }
  }, [items, mounted])

  const addToCart = (item: CartItem) => {
    setItems(prevItems => {
      const existing = prevItems.find(i => i.id === item.id)
      if (existing) {
        return prevItems.map(i =>
          i.id === item.id ? { ...i, qty: i.qty + item.qty } : i
        )
      }
      return [...prevItems, item]
    })
  }

  const removeFromCart = (id: number) => {
    setItems(items.filter(i => i.id !== id))
  }

  const updateQty = (id: number, qty: number) => {
    if (qty > 0) {
      setItems(items.map(i => i.id === id ? { ...i, qty } : i))
    }
  }

  const clearCart = () => {
    setItems([])
  }

  const total = items.reduce((sum, item) => sum + item.harga * item.qty, 0)

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQty, clearCart, total }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}
