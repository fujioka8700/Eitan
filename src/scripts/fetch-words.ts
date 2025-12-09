/**
 * 英単語データをWebサイトから取得するスクリプト
 * 
 * 使用方法:
 * npx tsx scripts/fetch-words.ts
 */

import https from 'https'

interface WordData {
  english: string
  japanese: string
  level: string
}

async function fetchHTML(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        resolve(data)
      })
    }).on('error', (err) => {
      reject(err)
    })
  })
}

function extractWordsFromHTML(html: string, level: string): WordData[] {
  const words: WordData[] = []
  
  // テーブルからデータを抽出
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi
  const tableMatches = html.match(tableRegex)
  
  if (tableMatches) {
    tableMatches.forEach((table) => {
      // 行を抽出
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
      const rowMatches = table.match(rowRegex)
      
      if (rowMatches) {
        rowMatches.forEach((row, index) => {
          if (index === 0) return // ヘッダー行をスキップ
          
          // セルを抽出
          const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
          const cells: string[] = []
          let cellMatch
          
          while ((cellMatch = cellRegex.exec(row)) !== null) {
            const cellText = cellMatch[1]
              .replace(/<[^>]+>/g, '') // HTMLタグを除去
              .replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .trim()
            if (cellText) {
              cells.push(cellText)
            }
          }
          
          if (cells.length >= 2) {
            const english = cells[0].trim()
            const japanese = cells[1].trim()
            if (english && japanese && english.length > 0 && japanese.length > 0) {
              words.push({ english, japanese, level })
            }
          }
        })
      }
    })
  }
  
  return words
}

async function fetchWordsFromURL(url: string, level: string): Promise<WordData[]> {
  try {
    console.log(`Fetching words from ${url}...`)
    const html = await fetchHTML(url)
    const words = extractWordsFromHTML(html, level)
    console.log(`Found ${words.length} words for ${level}`)
    return words
  } catch (error) {
    console.error(`Error fetching ${url}:`, error)
    return []
  }
}

async function main() {
  const urls = [
    {
      url: 'https://agreatdream.com/word-list-junior-high-school-1st-year/',
      level: '中1',
    },
    {
      url: 'https://agreatdream.com/word-list-junior-high-school-2nd-year/',
      level: '中2',
    },
    {
      url: 'https://agreatdream.com/word-list-junior-high-school-3rd-year/',
      level: '中3',
    },
  ]

  const allWords: WordData[] = []

  for (const { url, level } of urls) {
    const words = await fetchWordsFromURL(url, level)
    allWords.push(...words)
  }

  console.log(`\nTotal words found: ${allWords.length}`)
  console.log('\nSample words:')
  allWords.slice(0, 10).forEach((word) => {
    console.log(`  ${word.english} - ${word.japanese} (${word.level})`)
  })

  // JSONファイルとして出力
  const fs = require('fs')
  const path = require('path')
  const outputPath = path.join(__dirname, '../data/words.json')
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, JSON.stringify(allWords, null, 2), 'utf-8')
  console.log(`\nWords saved to ${outputPath}`)
}

main().catch(console.error)


