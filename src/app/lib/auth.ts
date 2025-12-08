import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export interface AuthUser {
  id: number
  email: string
  name: string | null
}

// パスワードをハッシュ化
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

// パスワードを検証
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// JWTトークンを生成
export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

// JWTトークンを検証
export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser
    return decoded
  } catch (error) {
    return null
  }
}

// ユーザー登録
export async function registerUser(
  email: string,
  password: string,
  name?: string
) {
  // 既存ユーザーをチェック
  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    throw new Error('このメールアドレスは既に登録されています')
  }

  // パスワードをハッシュ化
  const hashedPassword = await hashPassword(password)

  // ユーザーを作成
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: name || null,
    },
  })

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  }
}

// ユーザーログイン
export async function loginUser(email: string, password: string) {
  // ユーザーを検索
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    throw new Error('メールアドレスまたはパスワードが正しくありません')
  }

  // パスワードを検証
  const isValid = await verifyPassword(password, user.password)

  if (!isValid) {
    throw new Error('メールアドレスまたはパスワードが正しくありません')
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  }
}

