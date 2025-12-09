# 技術スタック

## 概要

本プロジェクトで使用する技術スタックの詳細を記載します。

## フロントエンド

### フレームワーク
- **Next.js** (TypeScript)
  - バージョン: 最新の安定版
  - 理由: サーバーサイドレンダリング、API Routes、優れた開発体験
  - 公式サイト: https://nextjs.org/

### UI ライブラリ
- **未定**（必要に応じて検討）
  - 候補: Tailwind CSS, shadcn/ui, Material-UI, Chakra UI など
  - 選定基準: シンプルで使いやすく、学習に集中できるデザインを実現できるもの

### 状態管理
- **React Hooks** (useState, useContext, useReducer)
- 必要に応じて **Zustand** や **Jotai** などの軽量ライブラリを検討

### ローカルストレージ管理
- **localStorage API** (ブラウザ標準)
- ゲストユーザーの学習進捗保存に使用

## バックエンド

### API
- **Next.js API Routes**
  - 理由: Next.js に統合されており、フロントエンドとバックエンドを同じプロジェクトで管理可能

### ORM
- **Prisma** (Version 6)
  - 理由: 型安全なデータベースアクセス、優れた開発体験
  - 公式サイト: https://www.prisma.io/
  - バージョン: 6.x

### データベース
- **PostgreSQL** (Version 16)
  - 理由: リレーショナルデータベース、Prisma との相性が良い
  - バージョン: 16.x

## インフラ

### コンテナ
- **Docker**
  - 開発環境の統一
  - Docker Compose を使用したマルチコンテナ管理

### データベース
- **PostgreSQL** (Docker Compose)
  - 開発環境でのデータベース管理

## 開発ツール

### 言語
- **TypeScript**
  - 型安全性の確保
  - 開発効率の向上

### パッケージマネージャー
- **npm**
  - Node.js 標準のパッケージマネージャー

### コード品質
- **ESLint** (推奨)
- **Prettier** (推奨)
- **TypeScript** の型チェック

## バージョン管理

### Git
- バージョン管理システム
- GitHub/GitLab などのリモートリポジトリを使用

## 開発環境

### Node.js
- **バージョン**: 24.x (Docker イメージ: node:24)

### データベース管理ツール
- **Prisma Studio**
  - データベースの可視化と管理
  - アクセス: http://localhost:5555/

## デプロイメント（将来）

### 候補
- **Vercel** (Next.js の推奨プラットフォーム)
- **AWS** (EC2, RDS)
- **Railway**
- **Render**

## 依存関係

### 主要パッケージ
```json
{
  "dependencies": {
    "next": "latest",
    "react": "latest",
    "react-dom": "latest",
    "@prisma/client": "^6.0.0",
    "prisma": "^6.0.0"
  },
  "devDependencies": {
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "typescript": "latest"
  }
}
```

## 環境変数

### 必要な環境変数
- `DATABASE_URL`: PostgreSQL への接続文字列
  - 形式: `postgresql://user:password@db:5432/myapp_db?schema=public`

## 参考資料

- [Next.js 公式ドキュメント](https://nextjs.org/docs)
- [Prisma 公式ドキュメント](https://www.prisma.io/docs)
- [PostgreSQL 公式ドキュメント](https://www.postgresql.org/docs/)
- [Docker 公式ドキュメント](https://docs.docker.com/)





