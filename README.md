# Profile

## 共通コンポーネント

サイドバーは `scripts/components.js` で一元管理し、`npm run build` 時に各HTMLへ展開します。各ページの `component:sidebar` マーカーで囲まれた範囲は直接編集しないでください。

ナビゲーション項目を変更する場合は `scripts/components.js` を編集してからビルドします。

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

## 動画・SNS投稿の埋め込み

YouTube動画とTwitter/Xのポストは、記事内の独立した行に専用記法でURLを記述します。

```md
@[youtube](https://www.youtube.com/watch?v=dQw4w9WgXcQ)

@[twitter](https://x.com/example/status/1234567890123456789)
```

YouTubeは通常の動画URL、短縮URL（`youtu.be`）、Shorts URLに対応しています。Twitter/Xは `x.com` と `twitter.com` のポストURLに対応しています。

追加・編集後に次のコマンドを実行すると、`blog.html` と `blog/*.html` が生成されます。

```sh
npm install
npm run build
```

## 日々の記録

ゲームや絵など、その日に行った活動は `daily` ディレクトリのMarkdownへまとめて記録します。

### ブラウザから編集する

次のコマンドを実行すると、ローカル専用の編集フォームがブラウザで開きます。

```sh
npm run daily:edit
```

フォームでは活動を必要なだけ追加でき、活動時間の合計とカテゴリーは自動で計算されます。「保存してビルド」を押すと `daily/YYYY-MM-DD.md` と公開用HTMLが更新されます。既存の記録も日付の一覧から編集できます。終了するにはターミナルで `Ctrl+C` を押します。

編集サーバーは `127.0.0.1:4173` だけで待ち受け、公開サイトには含まれません。ポートを変更する場合は `DAILY_EDITOR_PORT` を指定します。

```sh
DAILY_EDITOR_PORT=5000 npm run daily:edit
```

### 雛形を直接編集する

次のコマンドでJSTの当日の日付を使った雛形を作成できます。

```sh
npm run new-daily
```

日付を指定する場合は `YYYY-MM-DD` 形式で渡します。

```sh
npm run new-daily -- 2026-09-02
```

雛形は `templates/daily.md` です。生成されたファイルのfront matterに、その日の合計活動時間とカテゴリーを記入します。

```md
---
date: 2026-09-02
title: 2026-09-02の記録
minutes: 180
categories: ゲーム, 絵
---
```

- `date` は必須で、ファイル名と一致させます。
- `minutes` は0以上の整数で記述します。年間グラフの色分けに使われます。
- `categories` はカンマ区切りで記述します。
- 本文では活動ごとに見出しを作り、不要な雛形の項目は削除できます。

`npm run build` を実行すると、年間活動グラフを含む `log.html` と日別ページ `log/*.html` が生成されます。生成されたHTMLは直接編集しないでください。

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

## ギャラリー画像の追加

元画像をカテゴリーに対応するフォルダへ追加します。

```text
gallery-src/
├── games/   # ゲームのスクリーンショット
├── dolls/   # ドールの写真
├── imas/    # アイドルマスター関連の画像
└── photos/  # 通常の撮影写真
```

対応形式は `.jpg`、`.jpeg`、`.png`、`.webp`、`.heic` です。ファイル名からキャプションを生成するため、内容が分かる名前を付けてください。ハイフンとアンダースコアは空白として表示されます。

各カテゴリー内の画像は、EXIFの撮影日時が新しい順に表示されます。EXIFに撮影日時がない場合はファイル名に含まれる日時を使用し、どちらからも取得できない画像は末尾へファイル名順で表示します。

```text
gallery-src/games/ff14-絶エデン.jpg
gallery-src/dolls/夏服コーデ.jpg
gallery-src/imas/ライブ衣装.jpg
gallery-src/photos/夕暮れの海.jpg
```

画像を追加したらビルドします。

```sh
npm run build
```

ビルド時に次の処理を行います。

- 表示用画像を最大幅1600px、品質82のWebPへ変換
- サムネイルを最大幅480px、品質78のWebPへ変換
- EXIFなどの画像メタデータを削除
- `gallery.html` のゲーム・ドール・アイマス・写真欄を自動更新

生成画像は `images/gallery` に出力されます。このフォルダ内のファイルと、`gallery.html` 内の `gallery:*` マーカーで囲まれた部分は直接編集しないでください。

## トップ画像の最適化

トップ画像の元ファイルは `image-src/profile-doll.jpg` です。`npm run build` を実行すると、最大幅1280px、品質82のWebPへ変換し、`images/profile-doll.webp` に出力します。トップページは生成されたWebPを参照します。
