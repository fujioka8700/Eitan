'use client'

import { useState, useEffect } from 'react'

interface User {
  id: number
  email: string
  name: string | null
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUser = () => {
    try {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const parsedUser = JSON.parse(userStr)
        setUser(parsedUser)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Error parsing user:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 初回読み込み
    loadUser()

    // ローカルストレージの変更を監視
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user') {
        loadUser()
      }
    }

    // カスタムイベントを監視（同じタブ内での変更を検知）
    const handleCustomStorageChange = () => {
      loadUser()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('auth-state-changed', handleCustomStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('auth-state-changed', handleCustomStorageChange)
    }
  }, [])

  const updateUser = (newUser: User | null) => {
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser))
    } else {
      localStorage.removeItem('user')
    }
    setUser(newUser)
    // カスタムイベントを発火して他のコンポーネントに通知
    window.dispatchEvent(new Event('auth-state-changed'))
  }

  return { user, loading, updateUser }
}


