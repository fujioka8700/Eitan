'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../hooks/useAuth'

interface UserWord {
  id: number
  wordId: number
  status: string
  correctCount: number
  mistakeCount: number
  lastStudiedAt: string | null
  word: {
    id: number
    english: string
    japanese: string
    level: string
  }
}

export default function StatsPage() {
  const router = useRouter()
  const { user, updateUser } = useAuth()
  const [userWords, setUserWords] = useState<UserWord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [nameError, setNameError] = useState('')
  const [nameLoading, setNameLoading] = useState(false)

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      try {
        const response = await fetch('/api/user-words', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            router.push('/login')
            return
          }
          throw new Error('統計データの取得に失敗しました')
        }

        const data = await response.json()
        setUserWords(data.userWords || [])
      } catch (error) {
        setError(error instanceof Error ? error.message : 'エラーが発生しました')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [router])

  useEffect(() => {
    if (user) {
      setNewName(user.name || '')
    }
  }, [user])

  const handleUpdateName = async () => {
    setNameError('')
    setNameLoading(true)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/user/update-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newName.trim() || null }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '名前の更新に失敗しました')
      }

      const data = await response.json()
      updateUser(data.user)
      setIsEditingName(false)
    } catch (error) {
      setNameError(error instanceof Error ? error.message : '名前の更新に失敗しました')
    } finally {
      setNameLoading(false)
    }
  }

  // 統計を計算
  const totalWords = userWords.length
  const totalCorrect = userWords.reduce((sum, uw) => sum + uw.correctCount, 0)
  const totalMistakes = userWords.reduce((sum, uw) => sum + uw.mistakeCount, 0)
  const totalAttempts = totalCorrect + totalMistakes
  const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0

  // レベル別統計
  const levelStats = userWords.reduce((acc, uw) => {
    const level = uw.word.level
    if (!acc[level]) {
      acc[level] = { count: 0, correct: 0, mistakes: 0 }
    }
    acc[level].count++
    acc[level].correct += uw.correctCount
    acc[level].mistakes += uw.mistakeCount
    return acc
  }, {} as Record<string, { count: number; correct: number; mistakes: number }>)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg text-gray-600">読み込み中...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white p-8 shadow-xl">
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-800">
              {error}
            </div>
            <Link
              href="/"
              className="text-blue-600 hover:underline"
            >
              ホームに戻る
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-6 flex flex-col gap-3">
            <h1 className="text-3xl font-bold text-gray-900">これまでのレポート</h1>
            {user && (
              <div className="flex flex-wrap items-center gap-2">
                {!isEditingName ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">表示名:</span>
                      <span className="font-semibold text-gray-900">
                        {user.name || user.email}
                      </span>
                    </div>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
                    >
                      名前を変更
                    </button>
                  </>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="名前を入力"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdateName()
                        } else if (e.key === 'Escape') {
                          setIsEditingName(false)
                          setNewName(user.name || '')
                          setNameError('')
                        }
                      }}
                      autoFocus
                    />
                    <button
                      onClick={handleUpdateName}
                      disabled={nameLoading}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {nameLoading ? '保存中...' : '保存'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingName(false)
                        setNewName(user.name || '')
                        setNameError('')
                      }}
                      disabled={nameLoading}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:bg-gray-100"
                    >
                      キャンセル
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {nameError && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
              {nameError}
            </div>
          )}

          {/* 全体統計 */}
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg bg-blue-50 p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{totalWords}</div>
              <div className="text-sm text-gray-600">学習単語数</div>
            </div>
            <div className="rounded-lg bg-green-50 p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{totalCorrect}</div>
              <div className="text-sm text-gray-600">正解数</div>
            </div>
            <div className="rounded-lg bg-red-50 p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{totalMistakes}</div>
              <div className="text-sm text-gray-600">間違い数</div>
            </div>
            <div className="rounded-lg bg-purple-50 p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{accuracy}%</div>
              <div className="text-sm text-gray-600">正答率</div>
            </div>
          </div>

          {/* レベル別統計 */}
          {Object.keys(levelStats).length > 0 && (
            <div className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">レベル別統計</h2>
              <div className="space-y-2">
                {Object.entries(levelStats).map(([level, stats]) => {
                  const levelAccuracy =
                    stats.correct + stats.mistakes > 0
                      ? Math.round((stats.correct / (stats.correct + stats.mistakes)) * 100)
                      : 0
                  return (
                    <div
                      key={level}
                      className="rounded-lg border border-gray-200 p-4"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-semibold text-gray-900">{level}</span>
                        <span className="text-sm text-gray-600">
                          正答率: {levelAccuracy}%
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">学習単語数:</span>{' '}
                          <span className="font-semibold">{stats.count}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">正解:</span>{' '}
                          <span className="font-semibold text-green-600">{stats.correct}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">間違い:</span>{' '}
                          <span className="font-semibold text-red-600">{stats.mistakes}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 学習履歴 */}
          {userWords.length > 0 ? (
            <div>
              <h2 className="mb-4 text-xl font-semibold text-gray-900">学習履歴</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {userWords.map((uw) => (
                  <div
                    key={uw.id}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {uw.word.english}
                        </div>
                        <div className="text-sm text-gray-600">
                          {uw.word.japanese} ({uw.word.level})
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-green-600">正解: {uw.correctCount}</div>
                        <div className="text-red-600">間違い: {uw.mistakeCount}</div>
                        <div className="text-gray-500">
                          状態: {uw.status}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-600">
              まだ学習履歴がありません。クイズやフラッシュカードで学習を始めましょう！
            </div>
          )}

          <div className="mt-8">
            <Link
              href="/"
              className="block text-center text-blue-600 hover:underline"
            >
              ホームに戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}


