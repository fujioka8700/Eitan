'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: number
  email: string
  name: string | null
}

export default function AuthButton() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // ローカルストレージからユーザー情報を取得
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        setUser(JSON.parse(userStr))
      } catch (error) {
        console.error('Error parsing user:', error)
      }
    }
    setLoading(false)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return null
  }

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {user.name || user.email} さん
        </span>
        <Link
          href="/stats"
          className="text-sm text-blue-600 hover:underline"
        >
          統計
        </Link>
        <button
          onClick={handleLogout}
          className="rounded-lg bg-gray-200 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-300"
        >
          ログアウト
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <Link
        href="/login"
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
      >
        ログイン
      </Link>
      <Link
        href="/register"
        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
      >
        新規登録
      </Link>
    </div>
  )
}


