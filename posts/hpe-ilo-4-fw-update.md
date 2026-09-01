---
title: HPE iLO 4のFWアップデート作業ログ
date: 2024-05-04
description: HPE iLO 4のファームウェアを2.55から2.82へアップデートした際の作業ログです。
---

FWを2.55から2.82にアップデートしたときの作業ログです。
参考記事の手順に沿って作業しました。

## 準備

- Linux環境（WSLのUbuntuを利用）

## ダウンロード

- [HPEのソフトウェア詳細ページ](https://support.hpe.com/connect/s/softwaredetails?language=en_US&softwareId=MTX_cbf231cf73f44ba08d49ce5cf6&tab=releaseNotes)にアクセスし、Download Softwareをクリック
- `*.scexe`にチェックをつけた状態でDownloadをクリック

## WSL

```shell
cd /mnt/c/Users/<user>/Downloads
sh CPXXXXXX.scexe --unpack=.
```

`ilo4_282.bin`が生成されたことを確認します。

## iLO

- iLOの管理画面にログイン
- Administration > Firmwareを開く
- Fileの「ファイルを選択」から先ほど抽出した`.bin`ファイルを選択し、Uploadをクリック

## 参考記事

- [HPE iLO4 ファームウェアアップデート](https://ichibariki.com/entry/2019/05/18/100106)
