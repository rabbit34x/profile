---
title: CelesteでEverest環境を複数作る方法
date: 2026-09-01
description: CelesteのEverest環境を用途ごとに複数用意し、切り替えて使う方法を紹介します。
---

Celesteで「Speedrun用」「Custom Map用」など、MOD構成の異なるEverest環境を分けて管理する方法です。

## 1. Celesteフォルダをコピーする

Steam版Celesteのフォルダを、用途ごとにコピーします。

例えば以下のようにします。

```text
D:\Steam\steamapps\common\

Celeste\
Celeste-Speedrun\
Celeste-CustomMaps\
```

それぞれ完全に独立した `Mods` フォルダを持てるため、

```text
Celeste-Speedrun\Mods\
    ├─ SpeedrunTool
    ├─ CelesteTAS
    └─ Speedrun Sheet

Celeste-CustomMaps\Mods\
    ├─ Custom Maps
    └─ 各種Helper
```

のようにMOD構成を分離できます。

## 2. OlympusにInstallationを追加する

Olympusの `Manage` から、コピーしたCelesteをそれぞれInstallationとして登録します。

例：

```text
Vanilla
→ D:\Steam\steamapps\common\Celeste

Speedrun
→ D:\Steam\steamapps\common\Celeste-Speedrun

CustomMaps
→ D:\Steam\steamapps\common\Celeste-CustomMaps
```

登録後、それぞれのInstallationを選択してEverestをインストールします。

## 3. steam_appid.txtを作成する

Steam版では、この作業が重要です。

コピーした各Celesteフォルダの `Celeste.exe` と同じ場所に、

```text
steam_appid.txt
```

を作成します。

中身は以下の1行だけです。

```text
504230
```

例えば、

```text
Celeste-Speedrun\
├─ Celeste.exe
├─ steam_appid.txt
└─ Mods\

Celeste-CustomMaps\
├─ Celeste.exe
├─ steam_appid.txt
└─ Mods\
```

となります。

## 504230とは？

`504230` はCelesteのSteam App IDです。

Steamではゲームごとに固有のApp IDが割り当てられており、Celesteには `504230` が割り当てられています。

`steam_appid.txt` は、その実行ファイルがどのSteamアプリとして動作するのかをSteamworksに認識させるために使用できます。

## なぜsteam_appid.txtが必要なのか

Steamworksには `SteamAPI_RestartAppIfNecessary` という仕組みがあります。

ゲームがSteam経由で起動されていない場合、Steamを経由して正規のアプリを起動し直すためのものです。

そのため、コピーした

```text
Celeste-CustomMaps\Celeste.exe
```

を直接起動しても、

```text
コピー版Celeste
    ↓
Steam
    ↓
Steamに登録されているCeleste
    ↓
本来のCeleste\Celeste.exe
```

と、本来のSteam Installationへ戻されることがあります。

Steamworksの仕様では `steam_appid.txt` が存在する場合、この再起動処理を回避できます。

そのためコピーしたCelesteに

```text
steam_appid.txt

504230
```

を配置することで、それぞれのInstallationを独立して起動できるようになります。

## 完成形

```text
Celeste\
└─ Vanilla

Celeste-Speedrun\
├─ Celeste.exe
├─ steam_appid.txt  # 504230
├─ Everest
└─ Mods\            # Speedrun用

Celeste-CustomMaps\
├─ Celeste.exe
├─ steam_appid.txt  # 504230
├─ Everest
└─ Mods\            # Custom Map用
```

あとはOlympusで使用したいInstallationを選択して起動すればOKです。

これでVanilla、Speedrun、Custom Mapなど、用途ごとにEverest/MOD環境を分離して管理できます。
