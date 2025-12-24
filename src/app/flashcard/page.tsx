'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
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
  const initialLevel = searchParams.get('level') || 'all';
  const initialCount = parseInt(searchParams.get('count') || '10');
  const initialMode = (searchParams.get('mode') || 'en-to-ja') as
    | 'en-to-ja'
    | 'ja-to-en';

  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState<Map<number, Progress>>(new Map());
  const [loading, setLoading] = useState(true);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false); // セッション終了フラグ
  const [timeLeft, setTimeLeft] = useState(5); // 5秒のカウントダウン
  const [isTimeUp, setIsTimeUp] = useState(false); // 時間切れフラグ
  const [wordCount, setWordCount] = useState(initialCount); // 選択された単語数
  const [level, setLevel] = useState(initialLevel); // レベルを状態として管理
  const [flashcardMode, setFlashcardMode] = useState<'en-to-ja' | 'ja-to-en'>(
    initialMode,
  ); // フラッシュカードモード
  const [isFlipped, setIsFlipped] = useState(false); // カードの表裏状態
  const [isNavigating, setIsNavigating] = useState(false); // ナビゲーション処理中フラグ
  const timeUpTimerRef = useRef<NodeJS.Timeout | null>(null); // 0秒表示後のタイマー（useRefで管理）
  const prevCardIndexRef = useRef<number>(0); // 前のカードインデックス（スワイプ検出用）

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

  // クエリパラメータからフラッシュカードモードを読み取って更新
  useEffect(() => {
    const modeFromParams = (searchParams.get('mode') || 'en-to-ja') as
      | 'en-to-ja'
      | 'ja-to-en';
    if (modeFromParams !== flashcardMode) {
      setFlashcardMode(modeFromParams);
    }
  }, [searchParams, flashcardMode]);

  // 単語を取得
  useEffect(() => {
    if (sessionStarted) return; // セッション開始後は再取得しない
    if (sessionFinished) return; // 結果画面表示中は再取得しない

    const fetchWords = async () => {
      // 初回読み込み時のみ読み込み状態を表示（単語が既に存在する場合は表示しない）
      if (words.length === 0) {
        setLoading(true);
      }
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
  }, [level, wordCount, router, sessionStarted, sessionFinished, words.length]);

  // フラッシュカードモードが変更されたらURLを更新
  const handleFlashcardModeChange = (newMode: 'en-to-ja' | 'ja-to-en') => {
    setFlashcardMode(newMode);
    const params = new URLSearchParams();
    params.set('mode', newMode);
    if (level !== 'all') {
      params.set('level', level);
    }
    params.set('count', wordCount.toString());
    router.push(`/flashcard?${params.toString()}`);
  };

  // 単語数が変更されたらURLを更新
  const handleWordCountChange = (count: number) => {
    setWordCount(count);
    const params = new URLSearchParams();
    params.set('mode', flashcardMode);
    if (level !== 'all') {
      params.set('level', level);
    }
    params.set('count', count.toString());
    router.push(`/flashcard?${params.toString()}`);
  };

  // レベル変更
  const handleLevelChange = (nextLevel: string) => {
    setLevel(nextLevel);
    setSessionStarted(false);
    setSessionFinished(false);
    setCurrentIndex(0);
    setTimeLeft(5);
    setIsTimeUp(false);
    prevCardIndexRef.current = 0;
    // URLを更新
    const params = new URLSearchParams();
    params.set('mode', flashcardMode);
    if (nextLevel !== 'all') {
      params.set('level', nextLevel);
    }
    params.set('count', wordCount.toString());
    router.push(`/flashcard?${params.toString()}`);
  };

  // カードが変わったら、表裏状態をリセット
  useEffect(() => {
    if (!sessionStarted || currentIndex >= words.length) return;
    setIsFlipped(false); // カードが変わったら表に戻す
  }, [currentIndex, sessionStarted, words.length]);

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
          const newIndex = currentIndex + 1;
          setCurrentIndex(newIndex);
          prevCardIndexRef.current = newIndex;
          setIsFlipped(false); // カードが変わったら表に戻す
          setTimeLeft(5); // タイマーをリセット
          setIsTimeUp(false);
          setIsNavigating(false); // ナビゲーション完了
        } else {
          // 最後のカードに到達したら結果画面を表示
          setSessionFinished(true);
          // 状態もリセット
          setCurrentIndex(0);
          prevCardIndexRef.current = 0;
          setIsFlipped(false);
          setIsNavigating(false); // ナビゲーション完了
        }
      }, 1000); // 0秒を1秒間表示
      timeUpTimerRef.current = timer;
      return () => {
        if (timer) clearTimeout(timer);
      };
    }
  }, [timeLeft, sessionStarted, words.length, isTimeUp, currentIndex]);

  // カードが変わったらタイマーをリセット
  useEffect(() => {
    if (!sessionStarted || currentIndex >= words.length) return;

    // 既存のタイマーをクリア
    if (timeUpTimerRef.current) {
      clearTimeout(timeUpTimerRef.current);
      timeUpTimerRef.current = null;
    }
    setTimeLeft(5);
    setIsTimeUp(false);

    prevCardIndexRef.current = currentIndex;
  }, [currentIndex, sessionStarted, words.length]);

  // 次のカードへ
  const nextCard = () => {
    // 処理中は何もしない（連打防止）
    if (isNavigating) return;

    // 処理開始
    setIsNavigating(true);

    // 0秒表示後のタイマーをクリア
    if (timeUpTimerRef.current) {
      clearTimeout(timeUpTimerRef.current);
      timeUpTimerRef.current = null;
    }

    if (currentIndex < words.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      prevCardIndexRef.current = newIndex;
      setIsFlipped(false); // カードが変わったら表に戻す
      setTimeLeft(5); // タイマーをリセット
      setIsTimeUp(false);
    } else {
      // 最後のカードに到達したら結果画面を表示
      setSessionFinished(true);
      // 状態もリセット
      setCurrentIndex(0);
      prevCardIndexRef.current = 0;
      setIsFlipped(false);
    }

    // 処理完了（少し遅延させて、状態更新が確実に反映されるようにする）
    setTimeout(() => {
      setIsNavigating(false);
    }, 100);
  };

  // 前のカードへ
  const prevCard = () => {
    // 処理中は何もしない（連打防止）
    if (isNavigating) return;

    // 処理開始
    setIsNavigating(true);

    // 0秒表示後のタイマーをクリア
    if (timeUpTimerRef.current) {
      clearTimeout(timeUpTimerRef.current);
      timeUpTimerRef.current = null;
    }

    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      prevCardIndexRef.current = newIndex;
      setIsFlipped(false); // カードが変わったら表に戻す
      setTimeLeft(5); // タイマーをリセット
      setIsTimeUp(false);
    }

    // 処理完了（少し遅延させて、状態更新が確実に反映されるようにする）
    setTimeout(() => {
      setIsNavigating(false);
    }, 100);
  };

  // 学習履歴をデータベースに保存（ログインユーザーの場合）
  const saveUserWord = async (wordId: number, isLearned: boolean) => {
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
          studyType: 'flashcard', // フラッシュカードであることを明示
          isLearned: isLearned, // 学習済みかどうか
        }),
      });
    } catch (error) {
      console.error('Error saving user word:', error);
    }
  };

  // 学習済みとしてマーク（現在のカード）
  const markAsStudied = () => {
    const currentWord = words[currentIndex];
    if (currentWord) {
      markAsStudiedForWord(currentWord.id);
    }
  };

  // 特定の単語を学習済みとしてマーク（トグル機能）
  const markAsStudiedForWord = (wordId: number) => {
    const newProgress = new Map(progress);
    const existing = newProgress.get(wordId) || {
      wordId,
      lastStudied: Date.now(),
      studyCount: 0,
      isLearned: false,
    };

    // トグル: 既に学習済みの場合は未学習に戻す
    const newIsLearned = !existing.isLearned;

    newProgress.set(wordId, {
      ...existing,
      lastStudied: Date.now(),
      studyCount: newIsLearned ? existing.studyCount + 1 : existing.studyCount,
      isLearned: newIsLearned,
    });
    setProgress(newProgress);
    saveProgress(newProgress);

    // データベースにも保存（ログインユーザーの場合）
    saveUserWord(wordId, newIsLearned);
  };

  // セッション開始
  const startSession = () => {
    // 状態をリセット
    setSessionFinished(false);
    setCurrentIndex(0);
    prevCardIndexRef.current = 0;
    setIsFlipped(false);
    setTimeLeft(5);
    setIsTimeUp(false);
    // セッション開始
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
                  フラッシュカードモードを選択
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleFlashcardModeChange('en-to-ja')}
                    className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                      flashcardMode === 'en-to-ja'
                        ? 'border-purple-600 bg-purple-600 text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    英語→日本語
                  </button>
                  <button
                    onClick={() => handleFlashcardModeChange('ja-to-en')}
                    className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                      flashcardMode === 'ja-to-en'
                        ? 'border-purple-600 bg-purple-600 text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    日本語→英語
                  </button>
                </div>
              </div>
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
                          ? 'border-purple-600 bg-purple-600 text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50'
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
                          ? 'border-purple-600 bg-purple-600 text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50'
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
                <p className="text-sm text-gray-500">
                  カードを左スワイプすると、覚えた（済）になります。
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

  // 結果画面を表示する時（「次へ」ボタンを押した時のみ）
  const shouldShowResults = sessionFinished;

  // 結果画面を表示
  if (shouldShowResults) {
    const learnedCount = words.filter((word) => {
      const wordProgress = progress.get(word.id);
      return wordProgress?.isLearned;
    }).length;
    const learnedPercentage =
      words.length > 0 ? Math.round((learnedCount / words.length) * 100) : 0;

    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white p-4 shadow-xl sm:p-8">
            <h1 className="mb-6 text-3xl font-bold text-gray-900">結果</h1>

            <div className="mb-8 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-blue-50 p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {learnedCount} / {words.length}
                </div>
                <div className="text-sm text-gray-600">覚えた単語数</div>
              </div>
              <div className="rounded-lg bg-green-50 p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {learnedPercentage}%
                </div>
                <div className="text-sm text-gray-600">覚えた割合</div>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                単語別結果
              </h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {words.map((word) => {
                  const wordProgress = progress.get(word.id);
                  const isLearned = wordProgress?.isLearned || false;
                  return (
                    <div
                      key={word.id}
                      className={`rounded-lg p-4 ${
                        isLearned
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">
                            {flashcardMode === 'en-to-ja'
                              ? word.english
                              : word.japanese}
                          </div>
                          <div className="text-sm text-gray-600">
                            {flashcardMode === 'en-to-ja'
                              ? word.japanese
                              : word.english}{' '}
                            ({word.level})
                          </div>
                        </div>
                        <div
                          className={`text-2xl ${
                            isLearned ? 'text-green-600' : 'text-gray-400'
                          }`}
                        >
                          {isLearned ? '✓' : '○'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => {
                  // タイマーをクリア
                  if (timeUpTimerRef.current) {
                    clearTimeout(timeUpTimerRef.current);
                    timeUpTimerRef.current = null;
                  }
                  // 状態を完全にリセット（最初の設定画面に戻る）
                  setSessionFinished(false);
                  setSessionStarted(false);
                  setCurrentIndex(0);
                  prevCardIndexRef.current = 0;
                  setIsFlipped(false);
                  setTimeLeft(5);
                  setIsTimeUp(false);
                  // 画面を再レンダリングするために、強制的に状態を更新
                  // これにより、最初の設定画面が表示される
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
    );
  }

  const currentWord = words[currentIndex];
  const wordProgress = progress.get(currentWord?.id || 0);

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
          {words.length > 0 && sessionStarted && currentWord && (
            <div
              className="mb-6 sm:mb-8 flex justify-center"
              style={{
                minHeight: '380px',
                width: '100%',
              }}
            >
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="flex cursor-pointer items-center justify-center rounded-2xl border-2 p-8 shadow-lg transition-all hover:shadow-xl"
                style={{
                  width: '90%',
                  maxWidth: '600px',
                  minHeight: '300px',
                  borderColor: wordProgress?.isLearned ? '#4ade80' : '#cbd5e1',
                  background: wordProgress?.isLearned
                    ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)'
                    : 'linear-gradient(135deg, #eff6ff, #eef2ff)',
                }}
              >
                {flashcardMode === 'en-to-ja' ? (
                  isFlipped ? (
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
                  ) : (
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900 sm:text-4xl">
                        {currentWord.english}
                      </div>
                      <div className="mt-4 text-xs text-gray-400 sm:text-sm">
                        クリックして意味を表示
                      </div>
                    </div>
                  )
                ) : isFlipped ? (
                  <div className="text-center">
                    <div className="mb-4 text-xs text-gray-500 sm:text-sm">
                      英単語
                    </div>
                    <div className="text-3xl font-bold text-gray-900 sm:text-4xl">
                      {currentWord.english}
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-gray-900 sm:text-3xl">
                      {currentWord.japanese}
                    </div>
                    <div className="mt-2 text-xs text-gray-500 sm:text-sm">
                      {currentWord.level}
                    </div>
                    <div className="mt-4 text-xs text-gray-400 sm:text-sm">
                      クリックして英語を表示
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 操作ボタン */}
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
            {/* モバイル版: 「覚えた」ボタンを上に表示 */}
            <button
              onClick={markAsStudied}
              className={`flex-1 rounded-lg px-4 py-2 text-sm text-white transition-colors sm:hidden flex items-center justify-center text-center ${
                wordProgress?.isLearned
                  ? 'bg-green-300 active:bg-green-400'
                  : 'bg-green-600 active:bg-green-700'
              }`}
            >
              {wordProgress?.isLearned ? '覚えた（済）' : '覚えた'}
            </button>
            {/* 前へ/次へボタン（モバイル版は横並び、デスクトップ版は個別に配置） */}
            <div className="flex gap-2 sm:hidden">
              <button
                onClick={prevCard}
                disabled={currentIndex === 0 || isNavigating}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:bg-gray-50 flex items-center justify-center text-center"
              >
                前へ
              </button>
              <button
                onClick={nextCard}
                disabled={isNavigating}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-center"
              >
                {currentIndex === words.length - 1 ? '結果を表示する' : '次へ'}
              </button>
            </div>
            {/* デスクトップ版: 「前へ」「覚えた」「次へ」を横並び1列で表示 */}
            <button
              onClick={prevCard}
              disabled={currentIndex === 0 || isNavigating}
              className="hidden flex-1 rounded-lg border border-gray-300 bg-white px-6 py-3 text-base text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed sm:flex hover:bg-gray-50 items-center justify-center text-center"
            >
              前へ
            </button>
            <button
              onClick={markAsStudied}
              className={`hidden flex-1 rounded-lg px-6 py-3 text-base text-white transition-colors sm:flex items-center justify-center text-center ${
                wordProgress?.isLearned
                  ? 'bg-green-300 hover:bg-green-400'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {wordProgress?.isLearned ? '覚えた（済）' : '覚えた'}
            </button>
            <button
              onClick={nextCard}
              disabled={isNavigating}
              className="hidden flex-1 rounded-lg bg-blue-600 px-6 py-3 text-base text-white transition-colors sm:flex hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed items-center justify-center text-center"
            >
              {currentIndex === words.length - 1 ? '結果を表示する' : '次へ'}
            </button>
          </div>

          {/* ホームに戻る */}
          <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-4">
            <Link href="/" className="text-blue-600 hover:underline">
              ホームに戻る
            </Link>
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
