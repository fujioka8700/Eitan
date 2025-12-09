import { NextRequest, NextResponse } from 'next/server'
import { changePassword } from '../../../lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, currentPassword, newPassword } = body

    // バリデーション
    if (!email || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'メールアドレス、現在のパスワード、新しいパスワードは必須です' },
        { status: 400 }
      )
    }

    // 新しいパスワードの長さチェック
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: '新しいパスワードは6文字以上である必要があります' },
        { status: 400 }
      )
    }

    // パスワード変更
    await changePassword(email, currentPassword, newPassword)

    return NextResponse.json({
      message: 'パスワードが正常に変更されました',
    })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'パスワード変更に失敗しました' },
      { status: 401 }
    )
  }
}


