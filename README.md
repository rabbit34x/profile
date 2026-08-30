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
