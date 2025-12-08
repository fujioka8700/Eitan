/**
 * 英単語データのインポートスクリプト
 * 
 * 使用方法:
 * npx tsx scripts/import-words.ts
 */

import { PrismaClient } from '../app/generated/prisma/client'

const prisma = new PrismaClient()

// サンプルデータ（実際のデータは外部ソースから取得）
const sampleWords = [
  // 中1レベルのサンプル
  { english: 'apple', japanese: 'りんご', level: '中1' },
  { english: 'book', japanese: '本', level: '中1' },
  { english: 'cat', japanese: '猫', level: '中1' },
  { english: 'dog', japanese: '犬', level: '中1' },
  { english: 'egg', japanese: '卵', level: '中1' },
  { english: 'fish', japanese: '魚', level: '中1' },
  { english: 'green', japanese: '緑の', level: '中1' },
  { english: 'house', japanese: '家', level: '中1' },
  { english: 'ice', japanese: '氷', level: '中1' },
  { english: 'jump', japanese: '跳ぶ', level: '中1' },
  { english: 'key', japanese: '鍵', level: '中1' },
  { english: 'love', japanese: '愛', level: '中1' },
  { english: 'moon', japanese: '月', level: '中1' },
  { english: 'nice', japanese: '素晴らしい', level: '中1' },
  { english: 'open', japanese: '開ける', level: '中1' },
  { english: 'play', japanese: '遊ぶ', level: '中1' },
  { english: 'queen', japanese: '女王', level: '中1' },
  { english: 'read', japanese: '読む', level: '中1' },
  { english: 'sun', japanese: '太陽', level: '中1' },
  { english: 'tree', japanese: '木', level: '中1' },
  
  // 中2レベルのサンプル
  { english: 'beautiful', japanese: '美しい', level: '中2' },
  { english: 'careful', japanese: '注意深い', level: '中2' },
  { english: 'danger', japanese: '危険', level: '中2' },
  { english: 'enjoy', japanese: '楽しむ', level: '中2' },
  { english: 'famous', japanese: '有名な', level: '中2' },
  { english: 'garden', japanese: '庭', level: '中2' },
  { english: 'hobby', japanese: '趣味', level: '中2' },
  { english: 'important', japanese: '重要な', level: '中2' },
  { english: 'journey', japanese: '旅', level: '中2' },
  { english: 'kitchen', japanese: '台所', level: '中2' },
  
  // 中3レベルのサンプル
  { english: 'achieve', japanese: '達成する', level: '中3' },
  { english: 'benefit', japanese: '利益', level: '中3' },
  { english: 'challenge', japanese: '挑戦', level: '中3' },
  { english: 'develop', japanese: '発展させる', level: '中3' },
  { english: 'environment', japanese: '環境', level: '中3' },
  { english: 'foreign', japanese: '外国の', level: '中3' },
  { english: 'government', japanese: '政府', level: '中3' },
  { english: 'hospital', japanese: '病院', level: '中3' },
  { english: 'industry', japanese: '産業', level: '中3' },
  { english: 'journalist', japanese: 'ジャーナリスト', level: '中3' },
]

async function main() {
  console.log('英単語データのインポートを開始します...')

  let created = 0
  let skipped = 0

  for (const word of sampleWords) {
    try {
      await prisma.word.upsert({
        where: { english: word.english },
        update: {
          japanese: word.japanese,
          level: word.level,
        },
        create: word,
      })
      created++
      console.log(`✓ ${word.english} (${word.level})`)
    } catch (error) {
      console.error(`✗ ${word.english}:`, error)
      skipped++
    }
  }

  console.log(`\nインポート完了:`)
  console.log(`  作成/更新: ${created} 件`)
  console.log(`  スキップ: ${skipped} 件`)

  // 統計情報
  const stats = await prisma.word.groupBy({
    by: ['level'],
    _count: true,
  })

  console.log('\nレベル別統計:')
  stats.forEach((stat) => {
    console.log(`  ${stat.level}: ${stat._count} 件`)
  })
}

main()
  .catch((e) => {
    console.error('エラーが発生しました:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

