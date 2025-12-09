import { NextRequest, NextResponse } from 'next/server'
import { loginUser, generateToken } from '../../../lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // バリデーション
    if (!email || !password) {
      return NextResponse.json(
        { error: 'メールアドレスとパスワードは必須です' },
        { status: 400 }
      )
    }

    // ユーザーログイン
    const user = await loginUser(email, password)

    // トークンを生成
    const token = generateToken(user)

    return NextResponse.json({
      user,
      token,
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'ログインに失敗しました' },
      { status: 401 }
    )
  }
}


