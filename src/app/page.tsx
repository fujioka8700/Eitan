'use client'

import Link from 'next/link'
import { useAuth } from './hooks/useAuth'

export default function Home() {
  const { user, loading } = useAuth()

  return (
    <div className="py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          {!loading && user && (
            <div className="mb-6">
              <p className="text-lg font-semibold text-gray-900">
                ようこそ、{user.name || user.email} さん
              </p>
            </div>
          )}
          <p className="mb-8 text-base text-gray-600 sm:text-lg">
            中学1年〜3年レベルの英単語を効率的に学習できます。
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            登録不要で、誰でも気軽に使えます。
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/quiz?level=all&count=10"
              className="rounded-lg bg-green-600 p-6 text-center text-white transition-colors hover:bg-green-700"
            >
              <h2 className="mb-2 text-xl font-semibold">4択クイズ</h2>
              <p className="text-sm opacity-90">
                英単語の意味を4択で答えるクイズ
              </p>
            </Link>

            <Link
              href="/flashcard?level=all"
              className="rounded-lg bg-purple-600 p-6 text-center text-white transition-colors hover:bg-purple-700"
            >
              <h2 className="mb-2 text-xl font-semibold">フラッシュカード</h2>
              <p className="text-sm opacity-90">
                カードをめくって英単語を覚える
              </p>
            </Link>

            <Link
              href="/words"
              className="rounded-lg bg-blue-600 p-6 text-center text-white transition-colors hover:bg-blue-700"
            >
              <h2 className="mb-2 text-xl font-semibold">英単語一覧</h2>
              <p className="text-sm opacity-90">
                中1、中2、中3レベルの英単語を検索・閲覧
              </p>
            </Link>
          </div>

          <div className="mt-8 rounded-lg bg-gray-50 p-6">
            <p className="mb-6 text-base leading-relaxed text-gray-700">
              英単語の勉強、もっと楽しくしない？✨
              <br />
              <br />
              このアプリは、中学3年間で習う大切な英単語を、あなたの「今知りたい！」「今覚えたい！」に合わせて優しくサポートするために作られました。難しい単語帳はもう卒業！クイズで遊ぶみたいに、スキマ時間でサクッと単語をマスターしちゃおう。
            </p>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              主な機能
            </h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                学年ごとに絞り込み（中1/中2/中3）
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                英単語・日本語での検索
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                アルファベット順ソート
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                4択クイズ
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                フラッシュカード
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
