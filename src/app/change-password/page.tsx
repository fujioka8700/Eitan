'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ChangePasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    // バリデーション
    if (!email || !currentPassword || !newPassword || !confirmPassword) {
      setError('すべての項目を入力してください')
      return
    }

    if (newPassword.length < 6) {
      setError('新しいパスワードは6文字以上である必要があります')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('新しいパスワードと確認用パスワードが一致しません')
      return
    }

    if (currentPassword === newPassword) {
      setError('新しいパスワードは現在のパスワードと異なる必要があります')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          currentPassword,
          newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'パスワード変更に失敗しました')
      }

      setSuccess(true)
      // 3秒後にログインページにリダイレクト
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'パスワード変更に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <h1 className="mb-6 text-3xl font-bold text-gray-900">パスワード変更</h1>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-800">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-lg bg-green-50 p-4 text-green-800">
              パスワードが正常に変更されました。3秒後にログインページにリダイレクトします。
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={success}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="example@email.com"
              />
            </div>

            <div>
              <label
                htmlFor="currentPassword"
                className="block text-sm font-medium text-gray-700"
              >
                現在のパスワード
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={success}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="現在のパスワード"
              />
            </div>

            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-gray-700"
              >
                新しいパスワード
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={success}
                minLength={6}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="新しいパスワード（6文字以上）"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700"
              >
                新しいパスワード（確認）
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={success}
                minLength={6}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="新しいパスワード（確認）"
              />
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '変更中...' : success ? '変更完了' : 'パスワードを変更'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm text-blue-600 hover:underline"
            >
              ログインページに戻る
            </Link>
            <Link
              href="/"
              className="mt-4 block text-sm text-gray-600 hover:underline"
            >
              ホームに戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}


