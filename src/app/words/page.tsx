'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface Word {
  id: number;
  english: string;
  japanese: string;
  level: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function WordsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [words, setWords] = useState<Word[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(
    null,
  );
  const [level, setLevel] = useState<string>(
    searchParams.get('level') || 'all',
  );
  const [search, setSearch] = useState<string>(
    searchParams.get('search') || '',
  );
  const [sort, setSort] = useState<string>(
    searchParams.get('sort') || 'english',
  );
  const [order, setOrder] = useState<string>(
    searchParams.get('order') || 'asc',
  );
  const [currentPage, setCurrentPage] = useState<number>(
    parseInt(searchParams.get('page') || '1'),
  );

  // データ取得
  const fetchWords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (level !== 'all') params.set('level', level);
      if (search) params.set('search', search);
      params.set('sort', sort);
      params.set('order', order);
      params.set('page', currentPage.toString());

      const response = await fetch(`/api/words?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setWords(data.words);
        setPagination(data.pagination);
      } else {
        console.error('Failed to fetch words:', data.error);
      }
    } catch (error) {
      console.error('Error fetching words:', error);
    } finally {
      setLoading(false);
    }
  };

  // URLパラメータを更新
  useEffect(() => {
    const params = new URLSearchParams();
    if (level !== 'all') params.set('level', level);
    if (search) params.set('search', search);
    params.set('sort', sort);
    params.set('order', order);
    if (currentPage > 1) params.set('page', currentPage.toString());

    router.push(`/words?${params.toString()}`, { scroll: false });
  }, [level, search, sort, order, currentPage, router]);

  // 検索入力のデバウンス処理
  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchWords();
    }, 500); // 500ms待機

    setDebounceTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // データ取得（検索以外の変更時）
  useEffect(() => {
    fetchWords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, sort, order, currentPage]);

  // 検索ハンドラ
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchWords();
  };

  // ソート切り替え
  const handleSort = (newSort: string) => {
    if (sort === newSort) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(newSort);
      setOrder('asc');
    }
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">英単語一覧</h1>

        {/* フィルタ・検索エリア */}
        <div className="mb-6 space-y-4 rounded-lg bg-white p-4 shadow">
          {/* レベルフィルタ */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              レベル
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setLevel('all')}
                className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
                  level === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                全て
              </button>
              <button
                onClick={() => setLevel('中1')}
                className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
                  level === '中1'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                中1
              </button>
              <button
                onClick={() => setLevel('中2')}
                className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
                  level === '中2'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                中2
              </button>
              <button
                onClick={() => setLevel('中3')}
                className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
                  level === '中3'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                中3
              </button>
            </div>
          </div>

          {/* 検索フォーム */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="英単語または日本語で検索..."
              className="flex-1 rounded border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              検索
            </button>
          </form>

          {/* ソート */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">ソート:</span>
            <button
              onClick={() => handleSort('english')}
              className={`rounded px-3 py-1 text-sm transition-colors ${
                sort === 'english'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              英単語 {sort === 'english' && (order === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => handleSort('japanese')}
              className={`rounded px-3 py-1 text-sm transition-colors ${
                sort === 'japanese'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              日本語 {sort === 'japanese' && (order === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>

        {/* 単語一覧 */}
        {loading ? (
          <div className="text-center text-gray-600">読み込み中...</div>
        ) : words.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center text-gray-600 shadow">
            単語が見つかりませんでした
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              {pagination && (
                <>
                  全 {pagination.total} 件中{' '}
                  {(pagination.page - 1) * pagination.limit + 1} -{' '}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )}{' '}
                  件を表示
                </>
              )}
            </div>
            <div className="space-y-2">
              {words.map((word) => (
                <div
                  key={word.id}
                  className="rounded-lg bg-white p-4 shadow transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold text-gray-900">
                          {word.english}
                        </span>
                        <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                          {word.level}
                        </span>
                      </div>
                      <div className="mt-1 text-gray-600">{word.japanese}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ページネーション */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-6 flex justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="rounded bg-white px-4 py-2 text-gray-700 shadow disabled:opacity-50 hover:bg-gray-50"
                >
                  前へ
                </button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter(
                    (page) =>
                      page === 1 ||
                      page === pagination.totalPages ||
                      Math.abs(page - currentPage) <= 2,
                  )
                  .map((page, index, array) => (
                    <div key={page} className="flex items-center gap-2">
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span className="px-2 text-gray-500">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`rounded px-4 py-2 shadow transition-colors ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    </div>
                  ))}
                <button
                  onClick={() =>
                    setCurrentPage(
                      Math.min(pagination.totalPages, currentPage + 1),
                    )
                  }
                  disabled={currentPage === pagination.totalPages}
                  className="rounded bg-white px-4 py-2 text-gray-700 shadow disabled:opacity-50 hover:bg-gray-50"
                >
                  次へ
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function WordsPage() {
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
      <WordsContent />
    </Suspense>
  );
}
