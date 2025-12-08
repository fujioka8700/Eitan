import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'

// GET: 単語一覧を取得（検索・フィルタ・ソート対応）
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const level = searchParams.get('level') // 中1/中2/中3
    const search = searchParams.get('search') // 検索キーワード
    const sort = searchParams.get('sort') || 'english' // english/japanese
    const order = searchParams.get('order') || 'asc' // asc/desc
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // 検索条件の構築
    const where: {
      level?: string
      OR?: Array<{
        english?: { contains: string; mode?: 'insensitive' }
        japanese?: { contains: string; mode?: 'insensitive' }
      }>
    } = {}

    // レベルフィルタ
    if (level && (level === '中1' || level === '中2' || level === '中3')) {
      where.level = level
    }

    // 検索フィルタ（英単語または日本語）
    if (search) {
      where.OR = [
        { english: { contains: search, mode: 'insensitive' } },
        { japanese: { contains: search, mode: 'insensitive' } },
      ]
    }

    // ソート条件
    const orderBy: Record<string, 'asc' | 'desc'> = {}
    if (sort === 'english' || sort === 'japanese') {
      orderBy[sort] = order === 'desc' ? 'desc' : 'asc'
    } else {
      orderBy.english = 'asc'
    }

    // データ取得（パフォーマンス最適化：並列実行）
    const [words, total] = await Promise.all([
      prisma.word.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          english: true,
          japanese: true,
          level: true,
        },
      }),
      prisma.word.count({ where }),
    ])

    return NextResponse.json({
      words,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching words:', error)
    return NextResponse.json(
      { error: 'Failed to fetch words' },
      { status: 500 }
    )
  }
}

