# 開発サーバ（プレビュー環境）

本番（GitHub Pages）へ適用せずに変更を確認するためのプレビュー環境。Proxmox 上の専用 CT にあり、**必要な時だけ起動する**（常時起動しない）。

## 構成

- CT 116「profile-dev」（Proxmox ホスト minase、Ubuntu 24.04、1 core / 1024MB / 8GB、IP 192.168.0.116、`onboot=0`）
- CT 内の作業コピーは `/srv/profile`。systemd サービス `profile-preview` が起動時に `npm run build`（ギャラリー生成→コンポーネント展開→メタ生成）を実行してから、port 80 で静的配信する
- Node.js は 22 系が必須（sharp 0.35 が Node >= 20.9 を要求する。Ubuntu 標準の Node 18 では動かない）。CT には公式 tarball を `/usr/local` に入れてある

## 使い方

プレビュー URL: http://192.168.0.116/ （LAN 内のみ）

操作は Muse VM 上のラッパースクリプトに集約されている。

```sh
~/workspace/tools/profile-dev.sh start    # CT 起動 → 作業コピー同期 → 再ビルド → 配信開始
~/workspace/tools/profile-dev.sh sync     # 作業コピー（~/workspace/profile-site）の同期のみ
~/workspace/tools/profile-dev.sh rebuild  # 再ビルド＋配信再開（sync の後に使う）
~/workspace/tools/profile-dev.sh status   # CT の状態とプレビューの HTTP チェック
~/workspace/tools/profile-dev.sh stop     # CT 停止（使い終わったら止める）
```

- `start` は停止状態から約1分でプレビューが開く
- 同期は rsync（`.git` 込み、`node_modules` と `.claude` を除外）。`build-meta` がコミットハッシュを取るため `.git` が必要
- 編集の反映は「ローカルで編集 → `sync` → `rebuild`」。静的ファイルの追加・削除だけなら `sync` だけで反映される
- プレビューの確認が終わったら `stop` する。停止中はディスク 8GB のみで CPU / メモリは使わない
