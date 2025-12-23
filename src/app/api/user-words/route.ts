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
      // 統計計算には全件が必要なため、制限を削除
      // フロントエンド側で表示を20件に制限
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
    const { wordId, isCorrect, status, studyType, isLearned } = body // studyType: 'quiz' | 'flashcard', isLearned: boolean (フラッシュカード用)

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
      const updateData: any = {
        lastStudiedAt: new Date(),
        status: status || existing.status,
      }

      // 4択クイズの場合
      if (studyType === 'quiz') {
        updateData.quizCorrectCount = isCorrect
          ? existing.quizCorrectCount + 1
          : existing.quizCorrectCount
        updateData.quizMistakeCount = !isCorrect
          ? existing.quizMistakeCount + 1
          : existing.quizMistakeCount
        // 後方互換性のため、correctCountとmistakeCountも更新
        updateData.correctCount = isCorrect
          ? existing.correctCount + 1
          : existing.correctCount
        updateData.mistakeCount = !isCorrect
          ? existing.mistakeCount + 1
          : existing.mistakeCount
      }
      // フラッシュカードの場合
      else if (studyType === 'flashcard') {
        if (isLearned === false) {
          // 未学習に戻す場合
          updateData.flashcardLearnedCount = 0
          // 後方互換性のため、correctCountも0にリセット（ただし、既存の値が0より大きい場合は維持）
          if (existing.correctCount > 0) {
            updateData.correctCount = Math.max(0, existing.correctCount - 1)
          }
        } else {
          // 学習済みにする場合
          updateData.flashcardLearnedCount = existing.flashcardLearnedCount + 1
          // 後方互換性のため、correctCountも更新
          updateData.correctCount = existing.correctCount + 1
        }
      }
      // 後方互換性のため、studyTypeが指定されていない場合は従来の動作
      else {
        updateData.correctCount = isCorrect
          ? existing.correctCount + 1
          : existing.correctCount
        updateData.mistakeCount = !isCorrect
          ? existing.mistakeCount + 1
          : existing.mistakeCount
      }

      const updated = await prisma.userWord.update({
        where: {
          id: existing.id,
        },
        data: updateData,
        include: {
          word: true,
        },
      })
      return NextResponse.json({ userWord: updated })
    } else {
      // 新規作成
      const createData: any = {
          userId: user.id,
          wordId: parseInt(wordId),
          lastStudiedAt: new Date(),
          status: status || '学習中',
      }

      // 4択クイズの場合
      if (studyType === 'quiz') {
        createData.quizCorrectCount = isCorrect ? 1 : 0
        createData.quizMistakeCount = !isCorrect ? 1 : 0
        // 後方互換性のため、correctCountとmistakeCountも設定
        createData.correctCount = isCorrect ? 1 : 0
        createData.mistakeCount = !isCorrect ? 1 : 0
      }
      // フラッシュカードの場合
      else if (studyType === 'flashcard') {
        createData.flashcardLearnedCount = 1
        // 後方互換性のため、correctCountも設定
        createData.correctCount = 1
        createData.mistakeCount = 0
      }
      // 後方互換性のため、studyTypeが指定されていない場合は従来の動作
      else {
        createData.correctCount = isCorrect ? 1 : 0
        createData.mistakeCount = !isCorrect ? 1 : 0
      }

      const created = await prisma.userWord.create({
        data: createData,
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

