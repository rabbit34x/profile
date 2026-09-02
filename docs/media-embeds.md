# 動画・SNS投稿の埋め込み

ブログ記事では、YouTube動画とTwitter/Xの投稿を専用記法で埋め込めます。記事内の独立した行にURLを記述します。

## YouTube

```md
@[youtube](https://www.youtube.com/watch?v=dQw4w9WgXcQ)
```

通常の動画URL、短縮URL（`youtu.be`）、Shorts URLに対応しています。

## Twitter / X

```md
@[twitter](https://x.com/example/status/1234567890123456789)
```

`x.com` と `twitter.com` の投稿URLに対応しています。

追加・編集後にサイトをビルドしてください。

```sh
npm run build
```
