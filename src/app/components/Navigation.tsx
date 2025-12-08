'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, updateUser } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('token')
    updateUser(null)
    setIsMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  const navLinks = [
    { href: '/', label: 'ホーム' },
    { href: '/quiz?level=all&count=10', label: '4択クイズ' },
    { href: '/flashcard?level=all', label: 'フラッシュカード' },
    { href: '/words', label: '単語一覧' },
  ]

  if (user) {
    navLinks.push({ href: '/stats', label: '統計' })
  }

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname?.startsWith(href.split('?')[0])
  }

  return (
    <nav className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* ロゴ */}
          <div className="flex items-center">
            <Link
              href="/"
              className="text-xl font-bold text-gray-900 hover:text-blue-600"
            >
              📚 英語学習アプリ ✨
            </Link>
          </div>

          {/* デスクトップナビゲーション */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {!loading && (
              <div className="ml-4 flex items-center gap-2 border-l border-gray-200 pl-4">
                {user ? (
                  <>
                    <span className="text-sm text-gray-600">
                      {user.name || user.email}
                    </span>
                    <button
                      onClick={handleLogout}
                      className="rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200"
                    >
                      ログアウト
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-700"
                    >
                      ログイン
                    </Link>
                    <Link
                      href="/register"
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      登録
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          {/* モバイルメニューボタン */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="rounded-md p-2 text-gray-700 hover:bg-gray-100"
              aria-label="メニュー"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* モバイルメニュー */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="space-y-1 border-t border-gray-200 px-2 pb-3 pt-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block rounded-md px-3 py-2 text-base font-medium ${
                    isActive(link.href)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {!loading && (
                <div className="mt-4 space-y-2 border-t border-gray-200 pt-4">
                  {user ? (
                    <>
                      <div className="px-3 py-2 text-sm text-gray-600">
                        {user.name || user.email} さん
                      </div>
                      <button
                        onClick={handleLogout}
                        className="block w-full rounded-md bg-gray-100 px-3 py-2 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-200"
                      >
                        ログアウト
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        onClick={() => setIsMenuOpen(false)}
                        className="block rounded-md bg-blue-600 px-3 py-2 text-center text-base font-medium text-white transition-colors hover:bg-blue-700"
                      >
                        ログイン
                      </Link>
                      <Link
                        href="/register"
                        onClick={() => setIsMenuOpen(false)}
                        className="block rounded-md border border-gray-300 bg-white px-3 py-2 text-center text-base font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        新規登録
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

