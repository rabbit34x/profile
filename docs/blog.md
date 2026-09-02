# ブログ

## 記事の追加

`posts` ディレクトリにMarkdownファイルを追加します。ファイル名が記事URLになります。

```md
---
title: 記事タイトル
date: 2026-08-20
description: 一覧に表示する短い説明
---

ここから本文です。
```

- `title` は必須です。
- `date` は必須で、`YYYY-MM-DD` 形式で記述します。
- `description` は省略できます。

## 生成

追加・編集後にビルドすると、`blog.html` と `blog/*.html` が生成されます。

```sh
npm run build
```

YouTube動画やTwitter/Xの投稿を掲載する方法は、[動画・SNS投稿の埋め込み](media-embeds.md)を参照してください。
