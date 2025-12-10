'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Word {
  id: number
  english: string
  japanese: string
  level: string
}

interface QuizResult {
  wordId: number
  english: string
  japanese: string
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean
  timeSpent: number
}

function QuizContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialLevel = searchParams.get('level') || 'all'
  const initialCount = parseInt(searchParams.get('count') || '10')

  const [selectedLevel, setSelectedLevel] = useState(initialLevel)

  const [words, setWords] = useState<Word[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState<Word | null>(null)
  const [options, setOptions] = useState<string[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [results, setResults] = useState<QuizResult[]>([])
  const [timeLeft, setTimeLeft] = useState(10)
  const [isTimeUp, setIsTimeUp] = useState(false)
  const [loading, setLoading] = useState(true)
  const [quizStarted, setQuizStarted] = useState(false)
  const [quizFinished, setQuizFinished] = useState(false)
  const [hasTimeLimit, setHasTimeLimit] = useState(true) // 全問題で時間制限
  const [questionCount, setQuestionCount] = useState(initialCount) // 選択された問題数

  // クイズ用の単語を取得
  useEffect(() => {
    if (quizStarted) return // クイズ開始後は再取得しない

    const fetchWords = async () => {
      try {
        const params = new URLSearchParams()
        if (selectedLevel !== 'all') {
          params.set('level', selectedLevel)
        }
        params.set('count', questionCount.toString())

        const response = await fetch(`/api/quiz/words?${params.toString()}`)
        const data = await response.json()

        if (data.words && data.words.length > 0) {
          setWords(data.words)
          setCurrentQuestion(data.words[0])
          generateOptions(data.words[0], data.words)
        } else {
          alert('単語が見つかりませんでした。')
          router.push('/')
        }
      } catch (error) {
        console.error('Error fetching words:', error)
        alert('単語の取得に失敗しました。')
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    fetchWords()
  }, [selectedLevel, questionCount, router, quizStarted])

  // レベルが変更されたらURLを更新
  const handleLevelChange = (newLevel: string) => {
    setSelectedLevel(newLevel)
    const params = new URLSearchParams()
    if (newLevel !== 'all') {
      params.set('level', newLevel)
    }
    params.set('count', questionCount.toString())
    router.push(`/quiz?${params.toString()}`)
  }

  // 問題数が変更されたらURLを更新
  const handleQuestionCountChange = (count: number) => {
    setQuestionCount(count)
    const params = new URLSearchParams()
    if (selectedLevel !== 'all') {
      params.set('level', selectedLevel)
    }
    params.set('count', count.toString())
    router.push(`/quiz?${params.toString()}`)
  }

  // 選択肢を生成（正解1つ + ランダムな誤答3つ）
  const generateOptions = (question: Word, allWords: Word[]) => {
    const correctAnswer = question.japanese
    const wrongAnswers = allWords
      .filter((w) => w.id !== question.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((w) => w.japanese)

    const allOptions = [correctAnswer, ...wrongAnswers].sort(
      () => Math.random() - 0.5
    )
    setOptions(allOptions)
  }

  // タイマーの処理（全問題で時間制限）
  useEffect(() => {
    if (!quizStarted || quizFinished || isAnswered || !hasTimeLimit) return

    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      // 時間切れ
      setIsTimeUp(true)
      handleTimeUp()
    }
  }, [timeLeft, quizStarted, quizFinished, isAnswered, hasTimeLimit])

  // 時間切れの処理
  const handleTimeUp = () => {
    if (currentQuestion) {
      const result: QuizResult = {
        wordId: currentQuestion.id,
        english: currentQuestion.english,
        japanese: currentQuestion.japanese,
        userAnswer: '',
        correctAnswer: currentQuestion.japanese,
        isCorrect: false,
        timeSpent: 10 - timeLeft,
      }
      setResults([...results, result])
      setIsAnswered(true)

      // 学習履歴を保存（ログインユーザーの場合）
      saveUserWord(currentQuestion.id, false)

      // 2秒後に次の問題へ
      setTimeout(() => {
        moveToNextQuestion()
      }, 2000)
    }
  }

  // 学習履歴を保存
  const saveUserWord = async (wordId: number, isCorrect: boolean) => {
    const token = localStorage.getItem('token')
    if (!token) return // ゲストユーザーは保存しない

    try {
      await fetch('/api/user-words', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          wordId,
          isCorrect,
          status: isCorrect ? '習得済み' : '学習中',
        }),
      })
    } catch (error) {
      console.error('Error saving user word:', error)
    }
  }

  // 回答を選択
  const handleAnswerSelect = (answer: string) => {
    if (isAnswered || isTimeUp) return

    setSelectedAnswer(answer)
    setIsAnswered(true)

    if (currentQuestion) {
      const isCorrect = answer === currentQuestion.japanese
      const result: QuizResult = {
        wordId: currentQuestion.id,
        english: currentQuestion.english,
        japanese: currentQuestion.japanese,
        userAnswer: answer,
        correctAnswer: currentQuestion.japanese,
        isCorrect,
        timeSpent: 10 - timeLeft,
      }
      setResults([...results, result])

      // 学習履歴を保存（ログインユーザーの場合）
      saveUserWord(currentQuestion.id, isCorrect)

      // 2秒後に次の問題へ
      setTimeout(() => {
        moveToNextQuestion()
      }, 2000)
    }
  }

  // 次の問題へ
  const moveToNextQuestion = () => {
    const nextIndex = currentIndex + 1

    if (nextIndex >= words.length) {
      // クイズ終了
      setQuizFinished(true)
    } else {
      setCurrentIndex(nextIndex)
      setCurrentQuestion(words[nextIndex])
      generateOptions(words[nextIndex], words)
      setSelectedAnswer(null)
      setIsAnswered(false)
      setIsTimeUp(false)
      // 全問題で時間制限を維持（10秒にリセット）
      setHasTimeLimit(true)
      setTimeLeft(10)
    }
  }

  // クイズ開始
  const startQuiz = () => {
    setQuizStarted(true)
  }

  // 正答率を計算
  const calculateAccuracy = () => {
    if (results.length === 0) return 0
    const correctCount = results.filter((r) => r.isCorrect).length
    return Math.round((correctCount / results.length) * 100)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg text-gray-600">読み込み中...</div>
        </div>
      </div>
    )
  }

  if (!quizStarted) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white p-4 shadow-xl sm:p-8">
            <h1 className="mb-4 text-3xl font-bold text-gray-900">4択クイズ</h1>
            <div className="mb-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  レベルを選択
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { label: '全て', value: 'all' },
                    { label: '中1', value: '中1' },
                    { label: '中2', value: '中2' },
                    { label: '中3', value: '中3' },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => handleLevelChange(item.value)}
                      className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                        selectedLevel === item.value
                          ? 'border-green-600 bg-green-600 text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-green-300 hover:bg-green-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  問題数を選択
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[10, 30, 50].map((count) => (
                    <button
                      key={count}
                      onClick={() => handleQuestionCountChange(count)}
                      className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                        questionCount === count
                          ? 'border-green-600 bg-green-600 text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-green-300 hover:bg-green-50'
                      }`}
                    >
                      {count}問
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2 text-gray-600">
                <p>問題数: {words.length} 問</p>
                <p>レベル: {selectedLevel === 'all' ? '全て' : selectedLevel}</p>
                <p className="text-sm text-gray-500">
                  各問題は10秒以内に回答してください。
                </p>
              </div>
            </div>
            <button
              onClick={startQuiz}
              disabled={words.length === 0}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              クイズを開始
            </button>
            <Link
              href="/"
              className="mt-4 block text-center text-blue-600 hover:underline"
            >
              ホームに戻る
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (quizFinished) {
    const correctCount = results.filter((r) => r.isCorrect).length
    const accuracy = calculateAccuracy()

    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white p-4 shadow-xl sm:p-8">
            <h1 className="mb-6 text-3xl font-bold text-gray-900">結果</h1>

            <div className="mb-8 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-blue-50 p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {correctCount} / {results.length}
                </div>
                <div className="text-sm text-gray-600">正解数</div>
              </div>
              <div className="rounded-lg bg-green-50 p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {accuracy}%
                </div>
                <div className="text-sm text-gray-600">正答率</div>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                問題別結果
              </h2>
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`rounded-lg p-4 ${
                      result.isCorrect
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {result.english}
                        </div>
                        <div className="text-sm text-gray-600">
                          正解: {result.correctAnswer}
                          {!result.isCorrect && (
                            <span className="ml-2 text-red-600">
                              あなたの回答: {result.userAnswer || '時間切れ'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className={`text-2xl ${
                          result.isCorrect ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {result.isCorrect ? '✓' : '✗'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  // 状態をリセットしてから遷移
                  setQuizFinished(false)
                  setQuizStarted(false)
                  setCurrentIndex(0)
                  setResults([])
                  setSelectedAnswer(null)
                  setIsAnswered(false)
                  setIsTimeUp(false)
                  setTimeLeft(10)
                  setHasTimeLimit(true)
                  // ページをリロードして状態を完全にリセット
                  window.location.href = '/quiz?' + searchParams.toString()
                }}
                className="flex-1 rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
              >
                もう一度挑戦
              </button>
              <Link
                href="/"
                className="flex-1 rounded-lg border border-gray-300 px-6 py-3 text-center text-gray-700 transition-colors hover:bg-gray-50"
              >
                ホームに戻る
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg text-gray-600">問題を読み込み中...</div>
        </div>
      </div>
    )
  }

  // 進捗バーの幅を計算（10秒から0秒まで）
  const progressPercentage = (timeLeft / 10) * 100

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-4 shadow-xl sm:p-8">
          {/* 進捗表示 */}
          <div className="mb-6">
            <div className="mb-2 flex justify-between text-sm text-gray-600">
              <span>
                問題 {currentIndex + 1} / {words.length}
              </span>
              <span>残り時間: {timeLeft}秒</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-full transition-all duration-1000 ${
                  timeLeft <= 3
                    ? 'bg-red-500'
                    : timeLeft <= 5
                      ? 'bg-yellow-500'
                      : 'bg-blue-500'
                }`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* 問題表示 */}
          <div className="mb-6 text-center sm:mb-8">
            <h2 className="mb-4 text-xl font-bold text-gray-900 sm:text-2xl">
              {currentQuestion.english}
            </h2>
            <p className="text-sm text-gray-600 sm:text-base">
              日本語の意味を選んでください
            </p>
          </div>

          {/* 選択肢 */}
          <div className="space-y-2 sm:space-y-3">
            {options.map((option, index) => {
              const isSelected = selectedAnswer === option
              const isCorrect = option === currentQuestion.japanese
              let buttonClass =
                'w-full rounded-lg px-6 py-4 text-left transition-colors'

              if (isAnswered) {
                if (isCorrect) {
                  buttonClass += ' bg-green-500 text-white'
                } else if (isSelected && !isCorrect) {
                  buttonClass += ' bg-red-500 text-white'
                } else {
                  buttonClass += ' bg-gray-100 text-gray-600'
                }
              } else {
                buttonClass +=
                  ' bg-blue-50 text-gray-900 hover:bg-blue-100 border border-blue-200'
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={isAnswered || isTimeUp}
                  className={`${buttonClass} text-sm sm:text-base`}
                >
                  {option}
                </button>
              )
            })}
          </div>

          {/* フィードバック表示 */}
          {isAnswered && (
            <div
              className={`mt-6 rounded-lg p-4 text-center ${
                selectedAnswer === currentQuestion.japanese
                  ? 'bg-green-50 text-green-800'
                  : 'bg-red-50 text-red-800'
              }`}
            >
              {selectedAnswer === currentQuestion.japanese ? (
                <p className="font-semibold">正解です！</p>
              ) : (
                <p className="font-semibold">
                  不正解です。正解は「{currentQuestion.japanese}」です。
                </p>
              )}
            </div>
          )}

          {/* ホームへ戻る */}
          <div className="mt-6">
            <Link
              href="/"
              className="block text-center text-blue-600 hover:underline"
            >
              ホームへ戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function QuizPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-lg text-gray-600">読み込み中...</div>
          </div>
        </div>
      }
    >
      <QuizContent />
    </Suspense>
  )
}

