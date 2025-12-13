'use client';

import { useEffect, useState, useRef, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Word {
  id: number;
  english: string;
  japanese: string;
  level: string;
}

interface Progress {
  wordId: number;
  lastStudied: number;
  studyCount: number;
  isLearned: boolean;
}

function FlashcardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const level = searchParams.get('level') || 'all';
  const initialCount = parseInt(searchParams.get('count') || '10');

  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState<Map<number, Progress>>(new Map());
  const [loading, setLoading] = useState(true);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5); // 5秒のカウントダウン
  const [isFlipped, setIsFlipped] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false); // 時間切れフラグ
  const [wordCount, setWordCount] = useState(initialCount); // 選択された単語数
  const timeUpTimerRef = useRef<NodeJS.Timeout | null>(null); // 0秒表示後のタイマー（useRefで管理）
  const touchStartX = useRef<number | null>(null);
  const mouseStartX = useRef<number | null>(null);
  const swipeThreshold = useMemo(() => 50, []);

  // ローカルストレージから進捗を読み込む
  useEffect(() => {
    const savedProgress = localStorage.getItem('flashcard-progress');
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        const progressMap = new Map<number, Progress>();
        Object.entries(parsed).forEach(([key, value]) => {
          const record = value as Progress;
          progressMap.set(parseInt(key), {
            ...record,
            isLearned: record.isLearned ?? false,
          });
        });
        setProgress(progressMap);
      } catch (error) {
        console.error('Error loading progress:', error);
      }
    }
  }, []);

  // 進捗をローカルストレージに保存
  const saveProgress = (newProgress: Map<number, Progress>) => {
    const obj: Record<string, Progress> = {};
    newProgress.forEach((value, key) => {
      obj[key.toString()] = value;
    });
    localStorage.setItem('flashcard-progress', JSON.stringify(obj));
  };

  // 単語を取得
  useEffect(() => {
    if (sessionStarted) return; // セッション開始後は再取得しない

    const fetchWords = async () => {
      try {
        const params = new URLSearchParams();
        if (level !== 'all') {
          params.set('level', level);
        }
        params.set('count', wordCount.toString());

        const response = await fetch(`/api/quiz/words?${params.toString()}`);
        const data = await response.json();

        if (data.words && data.words.length > 0) {
          setWords(data.words);
        } else {
          alert('単語が見つかりませんでした。');
          router.push('/');
        }
      } catch (error) {
        console.error('Error fetching words:', error);
        alert('単語の取得に失敗しました。');
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    fetchWords();
  }, [level, wordCount, router, sessionStarted]);

  // 単語数が変更されたらURLを更新
  const handleWordCountChange = (count: number) => {
    setWordCount(count);
    const params = new URLSearchParams();
    if (level !== 'all') {
      params.set('level', level);
    }
    params.set('count', count.toString());
    router.push(`/flashcard?${params.toString()}`);
  };

  // レベル変更
  const handleLevelChange = (nextLevel: string) => {
    setLoading(true);
    setSessionStarted(false);
    setCurrentIndex(0);
    setIsFlipped(false);
    setTimeLeft(5);
    setIsTimeUp(false);

    const params = new URLSearchParams();
    if (nextLevel !== 'all') {
      params.set('level', nextLevel);
    }
    params.set('count', wordCount.toString());
    router.push(`/flashcard?${params.toString()}`);
  };

  // タイマーの処理
  useEffect(() => {
    if (!sessionStarted || currentIndex >= words.length) return;

    // 既存のタイマーをクリア
    if (timeUpTimerRef.current) {
      clearTimeout(timeUpTimerRef.current);
      timeUpTimerRef.current = null;
    }

    if (timeLeft > 0) {
      setIsTimeUp(false);

      const timer = setTimeout(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1;
          return newTime;
        });
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft <= 0 && !isTimeUp) {
      // 0秒になったら、1秒間表示してから次のカードへ（「次へ」が押されなかった場合）
      setIsTimeUp(true);
      const timer = setTimeout(() => {
        // タイマーをクリア
        timeUpTimerRef.current = null;
        if (currentIndex < words.length - 1) {
          setCurrentIndex((prev) => prev + 1);
          setIsFlipped(false);
          setTimeLeft(5); // タイマーをリセット
          setIsTimeUp(false);
        }
      }, 1000); // 0秒を1秒間表示
      timeUpTimerRef.current = timer;
      return () => {
        if (timer) clearTimeout(timer);
      };
    }
  }, [timeLeft, sessionStarted, currentIndex, words.length, isTimeUp]);

  // カードが変わったらタイマーをリセット
  useEffect(() => {
    if (sessionStarted && currentIndex < words.length) {
      // 既存のタイマーをクリア
      if (timeUpTimerRef.current) {
        clearTimeout(timeUpTimerRef.current);
        timeUpTimerRef.current = null;
      }
      setTimeLeft(5);
      setIsTimeUp(false);
    }
  }, [currentIndex, sessionStarted, words.length]);

  // カードをめくる
  const flipCard = () => {
    setIsFlipped(!isFlipped);
  };

  // 次のカードへ
  const nextCard = () => {
    // 0秒表示後のタイマーをクリア
    if (timeUpTimerRef.current) {
      clearTimeout(timeUpTimerRef.current);
      timeUpTimerRef.current = null;
    }

    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      setTimeLeft(5); // タイマーをリセット
      setIsTimeUp(false);
    }
  };

  // 前のカードへ
  const prevCard = () => {
    // 0秒表示後のタイマーをクリア
    if (timeUpTimerRef.current) {
      clearTimeout(timeUpTimerRef.current);
      timeUpTimerRef.current = null;
    }

    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
      setTimeLeft(5); // タイマーをリセット
      setIsTimeUp(false);
    }
  };

  // 学習履歴をデータベースに保存（ログインユーザーの場合）
  const saveUserWord = async (wordId: number) => {
    const token = localStorage.getItem('token');
    if (!token) return; // ゲストユーザーは保存しない

    try {
      await fetch('/api/user-words', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          wordId,
          isCorrect: true, // フラッシュカードは学習済みとして扱う
          status: '学習中',
        }),
      });
    } catch (error) {
      console.error('Error saving user word:', error);
    }
  };

  // 学習済みとしてマーク
  const markAsStudied = () => {
    if (words[currentIndex]) {
      const wordId = words[currentIndex].id;
      const newProgress = new Map(progress);
      const existing = newProgress.get(wordId) || {
        wordId,
        lastStudied: Date.now(),
        studyCount: 0,
        isLearned: false,
      };
      if (existing.isLearned) {
        setProgress(newProgress);
        saveProgress(newProgress);
        saveUserWord(wordId);
        return;
      }

      newProgress.set(wordId, {
        ...existing,
        lastStudied: Date.now(),
        studyCount: existing.studyCount + 1,
        isLearned: true,
      });
      setProgress(newProgress);
      saveProgress(newProgress);

      // データベースにも保存（ログインユーザーの場合）
      saveUserWord(wordId);
    }
  };

  // セッション開始
  const startSession = () => {
    setSessionStarted(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg text-gray-600">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (!sessionStarted) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white p-4 shadow-xl sm:p-8">
            <h1 className="mb-4 text-3xl font-bold text-gray-900">
              フラッシュカード
            </h1>
            <div className="mb-6 space-y-6">
              <div className="space-y-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
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
                        level === item.value
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  単語数を選択
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[10, 30, 50, 100].map((count) => (
                    <button
                      key={count}
                      onClick={() => handleWordCountChange(count)}
                      className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                        wordCount === count
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      {count}枚
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 text-gray-600">
                <p>単語数: {words.length} 枚</p>
                <p>レベル: {level === 'all' ? '全て' : level}</p>
                <p className="text-sm text-gray-500">
                  カードをクリックして裏面を表示できます。
                </p>
              </div>
            </div>
            <button
              onClick={startSession}
              disabled={words.length === 0}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              学習を開始
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
    );
  }

  if (words.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg text-gray-600">単語が見つかりません</div>
          <Link href="/" className="text-blue-600 hover:underline">
            ホームに戻る
          </Link>
        </div>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const wordProgress = progress.get(currentWord.id);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    touchStartX.current = null;
    if (delta > swipeThreshold) {
      markAsStudied();
      nextCard();
    } else if (delta < -swipeThreshold) {
      prevCard();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseStartX.current = e.clientX;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (mouseStartX.current === null) return;
    const delta = e.clientX - mouseStartX.current;
    mouseStartX.current = null;
    if (delta > swipeThreshold) {
      markAsStudied();
      nextCard();
    } else if (delta < -swipeThreshold) {
      prevCard();
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-4 shadow-xl sm:p-8">
          {/* 進捗表示 */}
          <div className="mb-6">
            <div className="mb-2 flex justify-between text-sm text-gray-600">
              <span>
                カード {currentIndex + 1} / {words.length}
              </span>
            </div>
            {/* カードの進捗バー */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{
                  width: `${((currentIndex + 1) / words.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* フラッシュカード */}
          <div
            onClick={flipCard}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            className={`mb-6 min-h-[250px] cursor-pointer rounded-lg border-2 p-6 shadow-lg transition-transform active:scale-95 sm:mb-8 sm:min-h-[300px] sm:p-8 sm:hover:scale-105 ${
              wordProgress?.isLearned
                ? 'border-green-400 bg-gradient-to-br from-emerald-50 to-green-50'
                : 'border-gray-300 bg-gradient-to-br from-blue-50 to-indigo-50'
            }`}
          >
            <div className="flex h-full items-center justify-center">
              {!isFlipped ? (
                <div className="text-center">
                  <div className="mb-4 text-xs text-gray-500 sm:text-sm">
                    英単語
                  </div>
                  <div className="text-3xl font-bold text-gray-900 sm:text-4xl">
                    {currentWord.english}
                  </div>
                  <div className="mt-4 text-xs text-gray-400 sm:text-sm">
                    クリックして意味を表示
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="mb-4 text-xs text-gray-500 sm:text-sm">
                    日本語
                  </div>
                  <div className="text-2xl font-semibold text-gray-900 sm:text-3xl">
                    {currentWord.japanese}
                  </div>
                  <div className="mt-2 text-xs text-gray-500 sm:text-sm">
                    {currentWord.level}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 操作ボタン */}
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
            <button
              onClick={prevCard}
              disabled={currentIndex === 0}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:bg-gray-50 sm:px-6 sm:py-3 sm:text-base sm:hover:bg-gray-50"
            >
              前へ
            </button>
            <button
              onClick={markAsStudied}
              disabled={wordProgress?.isLearned}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm text-white transition-colors disabled:cursor-not-allowed disabled:bg-green-300 active:bg-green-700 sm:px-6 sm:py-3 sm:text-base sm:hover:bg-green-700"
            >
              {wordProgress?.isLearned ? '覚えた（済）' : '覚えた'}
            </button>
            <button
              onClick={nextCard}
              disabled={currentIndex === words.length - 1}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:bg-blue-700 sm:px-6 sm:py-3 sm:text-base sm:hover:bg-blue-700"
            >
              次へ
            </button>
          </div>

          {/* ホームに戻る / フラッシュカードのTOPへ */}
          <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-4">
            <Link href="/" className="text-blue-600 hover:underline">
              ホームに戻る
            </Link>
            {currentIndex === words.length - 1 && (
              <>
                <span className="hidden text-gray-400 sm:inline">|</span>
                <button
                  onClick={() => {
                    window.location.href = '/flashcard';
                  }}
                  className="text-blue-600 hover:underline"
                >
                  フラッシュカードのTOPへ
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FlashcardPage() {
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
      <FlashcardContent />
    </Suspense>
  );
}
