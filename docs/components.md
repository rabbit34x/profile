# 共通コンポーネント

サイドバーは `scripts/components.js` で一元管理し、`npm run build` 時に各HTMLへ展開します。

各ページの次のマーカーで囲まれた範囲は直接編集しないでください。

```html
<!-- component:sidebar -->
<!-- /component:sidebar -->
```

ナビゲーション項目を変更する場合は `scripts/components.js` を編集してからビルドします。共通コンポーネントの展開対象ページは `scripts/build-components.js` で管理しています。
