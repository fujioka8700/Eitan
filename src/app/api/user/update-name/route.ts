import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '../../../lib/auth'
import { prisma } from '../../../lib/prisma'

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
    const { name } = body

    // バリデーション
    if (name !== null && name !== undefined && name.trim() === '') {
      return NextResponse.json(
        { error: '名前は空にできません' },
        { status: 400 }
      )
    }

    // 名前を更新
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { name: name?.trim() || null },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      user: updatedUser,
      message: '名前が正常に更新されました',
    })
  } catch (error) {
    console.error('Update name error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '名前の更新に失敗しました' },
      { status: 500 }
    )
  }
}

