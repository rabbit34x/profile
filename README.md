# Profile

## ブログ記事の追加

`posts` ディレクトリに `.md` ファイルを追加します。ファイル名が記事URLになります。

```md
---
title: 記事タイトル
date: 2026-08-20
description: 一覧に表示する短い説明
---

ここから本文です。
```

`title` と `date` は必須です。`date` は `YYYY-MM-DD` 形式で記述します。`description` は省略できます。

追加・編集後に次のコマンドを実行すると、`blog.html` と `blog/*.html` が生成されます。

```sh
npm install
npm run build
```

## 共通フッター

各ページのフッターには、最終更新日時とGitコミットハッシュを表示します。

- 最終更新日時は、ブラウザが取得したページの `Last-Modified` をJSTで表示します。
- コミットハッシュは、`npm run build` で生成される `site-meta.js` から表示します。
- 表示された短縮ハッシュは、GitHubの該当コミットへのリンクになります。

ローカルでは現在のGit HEADを使用します。

```sh
npm run build
```

CIでは `GITHUB_SHA` が設定されている場合、その値を優先します。公開するコミットのハッシュを正しく表示するため、デプロイ前に必ずビルドを実行してください。

```sh
GITHUB_SHA=<commit-hash> npm run build
```
