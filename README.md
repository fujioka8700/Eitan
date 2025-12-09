# Eitan (英語学習アプリ)

中学 1 年〜3 年レベルの英単語を効率的に学習できる Web アプリケーションです。
誰でも登録なしで利用できることを前提とした設計です。

## プロジェクト概要

- **目的**: 中学生向けの英単語学習アプリ
- **技術スタック**: Next.js, TypeScript, Prisma, PostgreSQL, Docker
- **主な機能**: 4 択クイズ、フラッシュカード、単語一覧、学習進捗管理

## ドキュメント

プロジェクトの詳細なドキュメントは `src/docs/` ディレクトリにあります。

- [要件定義書](./src/docs/requirements.md) - プロジェクトの要件定義
- [技術スタック](./src/docs/tech-stack.md) - 使用する技術の詳細
- [進捗管理](./src/docs/progress.md) - プロジェクトの進捗状況
- [プロジェクト管理](./src/docs/project-management.md) - プロジェクト管理方法
- [開発メモ](./src/docs/development-notes.md) - 開発中のメモや手順

## セットアップ

### 1. データベースのセットアップ

```bash
# Prismaスキーマをデータベースに適用
npm run db:push

# Prisma Clientを生成
npm run db:generate
```

### 2. サンプルデータのインポート

```bash
# 英単語のサンプルデータをインポート
npm run import:words
```

### 3. 開発サーバーの起動

```bash
# 開発サーバーを起動
npm run dev
```

ブラウザで http://localhost:3000 にアクセスしてください。

### その他のコマンド

```bash
# Prisma Studioを起動（データベースの可視化）
npm run db:studio
# http://localhost:5555 にアクセス

# ビルド
npm run build

# 本番環境で起動
npm start
```
