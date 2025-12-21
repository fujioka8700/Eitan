'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCards } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-cards';

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
  const initialMode = (searchParams.get('mode') || 'en-to-ja') as 'en-to-ja' | 'ja-to-en';

  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState<Map<number, Progress>>(new Map());
  const [loading, setLoading] = useState(true);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false); // セッション終了フラグ
  const [timeLeft, setTimeLeft] = useState(5); // 5秒のカウントダウン
  const [isFlipped, setIsFlipped] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false); // 時間切れフラグ
  const [wordCount, setWordCount] = useState(initialCount); // 選択された単語数
  const [level, setLevel] = useState(initialLevel); // レベルを状態として管理
  const [flashcardMode, setFlashcardMode] = useState<'en-to-ja' | 'ja-to-en'>(initialMode); // フラッシュカードモード
  const timeUpTimerRef = useRef<NodeJS.Timeout | null>(null); // 0秒表示後のタイマー（useRefで管理）
  const swiperRef = useRef<any>(null); // Swiperインスタンスの参照
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null); // タッチ開始位置と時間
  const isFlippedBeforeSlideRef = useRef<boolean>(false); // スライド変更前のisFlippedの状態
  const touchMovedRef = useRef<boolean>(false); // タッチ中に移動したかどうか
  const touchHandledRef = useRef<boolean>(false); // タッチイベントで処理済みかどうか

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
    const modeFromParams = (searchParams.get('mode') || 'en-to-ja') as 'en-to-ja' | 'ja-to-en';
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
  }, [level, wordCount, router, sessionStarted, sessionFinished]);

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
    setIsFlipped(false);
    setTimeLeft(5);
    setIsTimeUp(false);
    // URLを更新
    const params = new URLSearchParams();
    params.set('mode', flashcardMode);
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
        } else {
          // 最後のカードに到達したら結果画面を表示
          setSessionFinished(true);
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

  // SwiperのスライドをcurrentIndexに同期
  useEffect(() => {
    if (swiperRef.current && swiperRef.current.swiper) {
      swiperRef.current.swiper.slideTo(currentIndex);
    }
  }, [currentIndex]);

  // カードをめくる
  const flipCard = () => {
    setIsFlipped(!isFlipped);
  };

  // タッチ開始時の処理
  const handleTouchStart = (e: React.TouchEvent) => {
    // SwiperのactiveIndexを直接取得して、現在のカードかどうかを確認
    const index = parseInt(e.currentTarget.getAttribute('data-index') || '-1');
    const activeIndex = swiperRef.current?.swiper?.activeIndex ?? currentIndex;
    
    // 現在のカードでない場合は無視
    if (index !== activeIndex) {
      return;
    }
    
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    touchMovedRef.current = false;
    touchHandledRef.current = false;
  };

  // タッチ移動時の処理（スワイプを検出）
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // 10px以上移動したらスワイプとみなす
    if (distance > 10) {
      touchMovedRef.current = true;
    }
  };

  // タッチ終了時の処理（タップとスワイプを区別）
  const handleTouchEnd = (e: React.TouchEvent, index: number) => {
    // SwiperのactiveIndexを直接取得して、現在のカードかどうかを確認
    const activeIndex = swiperRef.current?.swiper?.activeIndex ?? currentIndex;
    
    if (!touchStartRef.current || index !== activeIndex) {
      touchStartRef.current = null;
      touchMovedRef.current = false;
      touchHandledRef.current = false;
      return;
    }

    // 移動していた場合はスワイプとみなす（Swiperのデフォルト動作を許可）
    if (touchMovedRef.current) {
      touchStartRef.current = null;
      touchMovedRef.current = false;
      touchHandledRef.current = false;
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    const deltaTime = Date.now() - touchStartRef.current.time;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // スワイプの判定: 移動距離が20px以上、または時間が400ms以上かかった場合はスワイプとみなす
    if (distance > 20 || deltaTime > 400) {
      // スワイプの場合は何もしない（Swiperのデフォルト動作を許可）
      touchStartRef.current = null;
      touchMovedRef.current = false;
      touchHandledRef.current = false;
      return;
    }

    // タップの場合はカードをめくる
    e.preventDefault();
    e.stopPropagation();
    touchHandledRef.current = true;
    flipCard();
    touchStartRef.current = null;
    touchMovedRef.current = false;
    
    // クリックイベントを防ぐために少し遅延
    setTimeout(() => {
      touchHandledRef.current = false;
    }, 300);
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
    } else {
      // 最後のカードに到達したら結果画面を表示
      setSessionFinished(true);
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
          studyType: 'flashcard', // フラッシュカードであることを明示
        }),
      });
    } catch (error) {
      console.error('Error saving user word:', error);
    }
  };

  // 学習済みとしてマーク（現在のカード）
  const markAsStudied = () => {
    if (words[currentIndex]) {
      markAsStudiedForWord(words[currentIndex].id);
    }
  };

  // 特定の単語を学習済みとしてマーク
  const markAsStudiedForWord = (wordId: number) => {
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
  };

  // セッション開始
  const startSession = () => {
    setSessionStarted(true);
    setSessionFinished(false);
    setCurrentIndex(0);
    setIsFlipped(false);
    setTimeLeft(5);
    setIsTimeUp(false);
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
    const learnedPercentage = words.length > 0 ? Math.round((learnedCount / words.length) * 100) : 0;

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
                            {flashcardMode === 'en-to-ja' ? word.english : word.japanese}
                          </div>
                          <div className="text-sm text-gray-600">
                            {flashcardMode === 'en-to-ja' ? word.japanese : word.english} ({word.level})
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
                  setSessionFinished(false);
                  setSessionStarted(false);
                  setCurrentIndex(0);
                  setIsFlipped(false);
                  setTimeLeft(5);
                  setIsTimeUp(false);
                  // ページをリロードせずに状態をリセット
                  // 単語は既に取得されているので、再取得は不要
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
  const wordProgress = progress.get(currentWord.id);

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
          <div className="mb-6 sm:mb-8" style={{ height: '320px', overflow: 'visible', position: 'relative', width: '100%', background: 'transparent' }}>
            <Swiper
              ref={swiperRef}
              effect="cards"
              grabCursor={true}
              modules={[EffectCards]}
              className="w-full h-full"
              style={{ width: '100%', height: '100%', overflow: 'visible', background: 'transparent' }}
              touchEventsTarget="wrapper"
              allowTouchMove={true}
              touchRatio={1}
              threshold={10}
              cardsEffect={{
                slideShadows: false,
                perSlideOffset: 8,
                perSlideRotate: 2,
              }}
              onSlideChangeTransitionStart={() => {
                // スライド変更のトランジション開始時に、現在のisFlippedの状態を保存
                isFlippedBeforeSlideRef.current = isFlipped;
              }}
              onSlideChange={(swiper) => {
                const newIndex = swiper.activeIndex;
                const prevIndex = currentIndex;
                // スライド変更前のisFlippedの状態を取得
                const wasFlipped = isFlippedBeforeSlideRef.current;
                setCurrentIndex(newIndex);
                setIsFlipped(false);
                setTimeLeft(5);
                setIsTimeUp(false);
                // タッチ状態をリセット
                touchStartRef.current = null;
                touchMovedRef.current = false;
                // 右スワイプ（次のカード）の時に「覚えた」扱いにする
                // ただし、裏側を表示していた場合は「覚えた」扱いにしない
                if (newIndex > prevIndex && prevIndex >= 0 && !wasFlipped) {
                  const prevWord = words[prevIndex];
                  if (prevWord) {
                    const prevWordProgress = progress.get(prevWord.id);
                    if (!prevWordProgress?.isLearned) {
                      markAsStudiedForWord(prevWord.id);
                    }
                  }
                }
                // リセット
                isFlippedBeforeSlideRef.current = false;
              }}
              initialSlide={currentIndex}
            >
              {words.map((word, index) => {
                const wordProgress = progress.get(word.id);
                // SwiperのactiveIndexを直接取得して、現在のカードかどうかを確認
                const activeIndex = swiperRef.current?.swiper?.activeIndex ?? currentIndex;
                const isFlippedForWord = index === activeIndex ? isFlipped : false;
                return (
                  <SwiperSlide key={word.id}>
                    <div
                      data-index={index}
                      onClick={(e) => {
                        // タッチイベントで処理済みの場合はクリックイベントを無視
                        if (touchHandledRef.current) {
                          e.preventDefault();
                          e.stopPropagation();
                          return;
                        }
                        // SwiperのactiveIndexを直接取得して、現在のカードかどうかを確認
                        const activeIndex = swiperRef.current?.swiper?.activeIndex ?? currentIndex;
                        if (index === activeIndex) {
                          flipCard();
                        }
                      }}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={(e) => handleTouchEnd(e, index)}
                      className={`cursor-pointer rounded-lg border-2 p-4 shadow-lg transition-transform sm:p-6 ${
                        wordProgress?.isLearned
                          ? 'border-green-400 bg-gradient-to-br from-emerald-50 to-green-50'
                          : 'border-gray-300 bg-gradient-to-br from-blue-50 to-indigo-50'
                      }`}
                      style={{ 
                        width: 'calc(100% - 120px)', 
                        height: '280px', 
                        maxWidth: 'calc(100% - 120px)', 
                        margin: '0 auto',
                        touchAction: 'manipulation' // ダブルタップズームを無効化し、タッチ操作を最適化
                      }}
                    >
                      <div className="flex h-full items-center justify-center">
                        {flashcardMode === 'en-to-ja' ? (
                          // 英語→日本語モード
                          !isFlippedForWord ? (
                            <div className="text-center">
                              <div className="mb-4 text-xs text-gray-500 sm:text-sm">
                                英単語
                              </div>
                              <div className="text-3xl font-bold text-gray-900 sm:text-4xl">
                                {word.english}
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
                                {word.japanese}
                              </div>
                              <div className="mt-2 text-xs text-gray-500 sm:text-sm">
                                {word.level}
                              </div>
                            </div>
                          )
                        ) : (
                          // 日本語→英語モード
                          !isFlippedForWord ? (
                            <div className="text-center">
                              <div className="mb-4 text-xs text-gray-500 sm:text-sm">
                                日本語
                              </div>
                              <div className="text-2xl font-semibold text-gray-900 sm:text-3xl">
                                {word.japanese}
                              </div>
                              <div className="mt-2 text-xs text-gray-500 sm:text-sm">
                                {word.level}
                              </div>
                              <div className="mt-4 text-xs text-gray-400 sm:text-sm">
                                クリックして英語を表示
                              </div>
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="mb-4 text-xs text-gray-500 sm:text-sm">
                                英単語
                              </div>
                              <div className="text-3xl font-bold text-gray-900 sm:text-4xl">
                                {word.english}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          </div>

          {/* 操作ボタン */}
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
            {/* モバイル版: 「覚えた」ボタンを上に表示 */}
            <button
              onClick={markAsStudied}
              disabled={wordProgress?.isLearned}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm text-white transition-colors disabled:cursor-not-allowed disabled:bg-green-300 active:bg-green-700 sm:hidden flex items-center justify-center text-center"
            >
              {wordProgress?.isLearned ? '覚えた（済）' : '覚えた'}
            </button>
            {/* 前へ/次へボタン（モバイル版は横並び、デスクトップ版は個別に配置） */}
            <div className="flex gap-2 sm:hidden">
              <button
                onClick={prevCard}
                disabled={currentIndex === 0}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:bg-gray-50 flex items-center justify-center text-center"
              >
                前へ
              </button>
              <button
                onClick={nextCard}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors active:bg-blue-700 flex items-center justify-center text-center"
              >
                {currentIndex === words.length - 1 ? '結果を表示する' : '次へ'}
              </button>
            </div>
            {/* デスクトップ版: 「前へ」「覚えた」「次へ」を横並び1列で表示 */}
            <button
              onClick={prevCard}
              disabled={currentIndex === 0}
              className="hidden flex-1 rounded-lg border border-gray-300 bg-white px-6 py-3 text-base text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed sm:flex hover:bg-gray-50 items-center justify-center text-center"
            >
              前へ
            </button>
            <button
              onClick={markAsStudied}
              disabled={wordProgress?.isLearned}
              className="hidden flex-1 rounded-lg bg-green-600 px-6 py-3 text-base text-white transition-colors disabled:cursor-not-allowed disabled:bg-green-300 sm:flex hover:bg-green-700 items-center justify-center text-center"
            >
              {wordProgress?.isLearned ? '覚えた（済）' : '覚えた'}
            </button>
            <button
              onClick={nextCard}
              className="hidden flex-1 rounded-lg bg-blue-600 px-6 py-3 text-base text-white transition-colors sm:flex hover:bg-blue-700 items-center justify-center text-center"
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

