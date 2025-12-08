import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '../../lib/auth'
import { prisma } from '../../lib/prisma'

// GET: ユーザーの学習履歴を取得
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = verifyToken(token)

    if (!user) {
      return NextResponse.json({ error: '無効なトークンです' }, { status: 401 })
    }

    const userWords = await prisma.userWord.findMany({
      where: { userId: user.id },
      include: {
        word: {
          select: {
            id: true,
            english: true,
            japanese: true,
            level: true,
          },
        },
      },
      orderBy: {
        lastStudiedAt: 'desc',
      },
      take: 100, // 最新100件に制限（パフォーマンス向上）
    })

    return NextResponse.json({ userWords })
  } catch (error) {
    console.error('Error fetching user words:', error)
    return NextResponse.json(
      { error: '学習履歴の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// POST: 学習履歴を保存・更新
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = verifyToken(token)

    if (!user) {
      return NextResponse.json({ error: '無効なトークンです' }, { status: 401 })
    }

    const body = await request.json()
    const { wordId, isCorrect, status } = body

    if (!wordId) {
      return NextResponse.json(
        { error: 'wordIdは必須です' },
        { status: 400 }
      )
    }

    // 既存のレコードを取得
    const existing = await prisma.userWord.findUnique({
      where: {
        userId_wordId: {
          userId: user.id,
          wordId: parseInt(wordId),
        },
      },
    })

    if (existing) {
      // 更新
      const updated = await prisma.userWord.update({
        where: {
          id: existing.id,
        },
        data: {
          correctCount: isCorrect
            ? existing.correctCount + 1
            : existing.correctCount,
          mistakeCount: !isCorrect
            ? existing.mistakeCount + 1
            : existing.mistakeCount,
          lastStudiedAt: new Date(),
          status: status || existing.status,
        },
        include: {
          word: true,
        },
      })
      return NextResponse.json({ userWord: updated })
    } else {
      // 新規作成
      const created = await prisma.userWord.create({
        data: {
          userId: user.id,
          wordId: parseInt(wordId),
          correctCount: isCorrect ? 1 : 0,
          mistakeCount: !isCorrect ? 1 : 0,
          lastStudiedAt: new Date(),
          status: status || '学習中',
        },
        include: {
          word: true,
        },
      })
      return NextResponse.json({ userWord: created })
    }
  } catch (error) {
    console.error('Error saving user word:', error)
    return NextResponse.json(
      { error: '学習履歴の保存に失敗しました' },
      { status: 500 }
    )
  }
}

