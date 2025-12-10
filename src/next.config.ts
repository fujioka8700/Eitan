import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 本番環境用の最適化設定
  output: 'standalone', // スタンドアロンビルド（Dockerデプロイに最適）
  // パフォーマンス最適化
  compress: true,
  // 画像最適化
  images: {
    unoptimized: false,
  },
  // 本番環境でのエラーハンドリング
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;
