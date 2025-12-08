# 英語学習アプリ (Learn English)

中学1年〜3年レベルの英単語を効率的に学習できるWebアプリケーションです。
誰でも登録なしで利用できることを前提とした設計です。

## プロジェクト概要

- **目的**: 中学生向けの英単語学習アプリ
- **技術スタック**: Next.js, TypeScript, Prisma, PostgreSQL, Docker
- **主な機能**: 4択クイズ、フラッシュカード、単語一覧、学習進捗管理

## ドキュメント

プロジェクトの詳細なドキュメントは `src/docs/` ディレクトリにあります。

- [要件定義書](./src/docs/requirements.md) - プロジェクトの要件定義
- [技術スタック](./src/docs/tech-stack.md) - 使用する技術の詳細
- [進捗管理](./src/docs/progress.md) - プロジェクトの進捗状況
- [プロジェクト管理](./src/docs/project-management.md) - プロジェクト管理方法

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

## 開発手順（Antigravity を使う前の準備）

```bash
# Next.jsアプリ作成
$ docker compose run --rm app sh -c 'npx create-next-app . --typescript'

# コンテナ起動
$ docker compose up

# 所有者と所有グループの変更
$ sudo chown -R $USER:$USER src/

# Dockerコンテナを再作成し、デタッチモードでバックグラウンド起動
$ docker compose up --build -d

# サービス'app'の稼働中のコンテナ内でbashシェルを実行
$ docker compose exec app bash

# Prisma CLIとPrisma Clientをインストール(Version6を使用)
$ npm install prisma@6 @prisma/client@6

# Prismaの設定ファイルを初期化
$ npx prisma init

# Prismaスキーマを強制的にデータベースに同期（開発環境向け）
$ npx prisma db push

# Prismaスキーマに基づきPrisma Clientを生成する。
$ npx prisma generate

# 以下を実行し、http://localhost:5555/にアクセスするとPrisma Studioが使える
$ npx prisma studio
```

.env.local の作成

```text
# Prismaが使用するデータベースURL
DATABASE_URL="postgresql://user:password@db:5432/myapp_db?schema=public"
```

prisma/schema.prisma の定義

```text
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Todo {
  id    Int     @id @default(autoincrement())
  title String
}
```

## その他のコマンド

```bash
# タグの作成
$ git tag v1.0.0

# タグの一覧表示
$ git tag

# ブランチの切り替え
$ git switch develop

# 既存のブランチを一時的に切り替える（チェックアウト）
$ git checkout <タグ名>

# 過去のタグから新しいブランチを作成する
$ git checkout -b <新しいブランチ名> <タグ名>

# ローカルブランチを安全に削除する
$ git branch -d <branch-name>
```