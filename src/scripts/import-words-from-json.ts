/**
 * JSONファイルから英単語データをインポートするスクリプト
 * 
 * 使用方法:
 * npx tsx scripts/import-words-from-json.ts
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

interface WordData {
  english: string
  japanese: string
  level: string
}

async function main() {
  console.log('英単語データのインポートを開始します...')

  // 既存のデータをすべて削除
  console.log('既存のデータを削除しています...')
  const deleteCount = await prisma.word.deleteMany({})
  console.log(`既存のデータ ${deleteCount.count} 件を削除しました。`)

  // JSONファイルを読み込む
  const jsonPath = path.join(__dirname, '../data/words.json')
  
  if (!fs.existsSync(jsonPath)) {
    console.error(`エラー: ${jsonPath} が見つかりません`)
    console.log('まず scripts/fetch-words.ts を実行してデータを取得してください')
    process.exit(1)
  }

  const wordsData: WordData[] = JSON.parse(
    fs.readFileSync(jsonPath, 'utf-8')
  )

  console.log(`読み込んだ単語数: ${wordsData.length} 件`)

  let created = 0
  let updated = 0
  let skipped = 0
  let errors = 0

  // バッチ処理でインポート（パフォーマンス向上）
  const batchSize = 50
  for (let i = 0; i < wordsData.length; i += batchSize) {
    const batch = wordsData.slice(i, i + batchSize)
    
    await Promise.all(
      batch.map(async (word) => {
        try {
          // データの正規化
          const english = word.english.trim().toLowerCase()
          const japanese = word.japanese.trim()
          const level = word.level.trim()

          if (!english || !japanese || !level) {
            skipped++
            return
          }

          const result = await prisma.word.upsert({
            where: { english },
            update: {
              japanese,
              level,
            },
            create: {
              english,
              japanese,
              level,
            },
          })

          if (result.createdAt.getTime() === result.updatedAt.getTime()) {
            created++
          } else {
            updated++
          }
        } catch (error) {
          console.error(`✗ ${word.english}:`, error)
          errors++
        }
      })
    )

    // 進捗表示
    const processed = Math.min(i + batchSize, wordsData.length)
    console.log(`進捗: ${processed} / ${wordsData.length} (${Math.round((processed / wordsData.length) * 100)}%)`)
  }

  console.log(`\nインポート完了:`)
  console.log(`  新規作成: ${created} 件`)
  console.log(`  更新: ${updated} 件`)
  console.log(`  スキップ: ${skipped} 件`)
  console.log(`  エラー: ${errors} 件`)

  // 統計情報
  const stats = await prisma.word.groupBy({
    by: ['level'],
    _count: true,
  })

  console.log('\nレベル別統計:')
  stats.forEach((stat: { level: string; _count: number }) => {
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


