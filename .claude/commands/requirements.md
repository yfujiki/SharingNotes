# 要件

Vercel と Supabase を用いて、ユーザーが所属するチームごとに「メモ」や「記事」を共有できるアプリを作る。
チーム外の人は閲覧できず、RLS でアクセスを厳密に制御します。
さらに、検索時には JOIN を使って「ユーザー名＋メモタイトル＋本文」など複数カラムを横断的に検索します。

アイデア出しの時の会話はここに置いてあります。
https://chatgpt.com/share/68e9f6cb-f664-800f-b9ec-ab70e145ce30

## テックスタック

Vercel + Next.js
Supabase + PostgreSql + Authentication
将来的に Flutter のフロントエンドを視野に入れる

## リポジトリと Kanban

- リポジトリ: https://github.com/yfujiki/SharingNotes#
- Kanban: https://github.com/users/yfujiki/projects/4/

## 進め方

まず、GitHub にイシューの大項目をまとめ、その一つ一つについて詳細な strategy ドキュメント (Strategies/issue-$number.md) を作成し、それに従って実装を進める。
