import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

// GET: クイズ用の単語を取得（ランダムに指定数取得）
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const level = searchParams.get('level') // 中1/中2/中3/全レベル
    const count = parseInt(searchParams.get('count') || '10') // 取得する単語数

    // 検索条件の構築
    const where: { level?: string } = {}

    // レベルフィルタ
    if (level && (level === '中1' || level === '中2' || level === '中3')) {
      where.level = level
    }

    // 全単語を取得してからランダムに選択（必要なフィールドのみ取得）
    const allWords = await prisma.word.findMany({
      where,
      select: {
        id: true,
        english: true,
        japanese: true,
        level: true,
      },
    })

    // ランダムにシャッフル
    const shuffled = allWords.sort(() => Math.random() - 0.5)

    // 指定数だけ取得（最大で全単語数まで）
    const words = shuffled.slice(0, Math.min(count, allWords.length))

    return NextResponse.json({
      words,
      total: allWords.length,
    })
  } catch (error) {
    console.error('Error fetching quiz words:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quiz words' },
      { status: 500 }
    )
  }
}

