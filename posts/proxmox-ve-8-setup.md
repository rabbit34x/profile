---
title: Proxmox VE 8のセットアップ
date: 2024-04-03
description: Homelab構築のためにProxmox VE 8を導入し、リポジトリや2要素認証、SSHを設定した際のメモです。
---

Homelab構築のための第一歩としてProxmoxを導入したときのメモです。
基本的なインストールは手順に沿って実施するだけなので割愛します。

以下の設定については、[Proxmox VE Wiki](https://pve.proxmox.com/wiki/Main_Page)にも記載されています。

## Enterpriseリポジトリの無効化

デフォルトの状態かつサブスクリプションがない場合、`apt update`でエラーが発生します。Proxmoxにはサブスクリプションがない場合のリポジトリも用意されているため、そちらへ変更します。

```bash
cat /etc/apt/sources.list
deb http://ftp.debian.org/debian bookworm main contrib
deb http://ftp.debian.org/debian bookworm-updates main contrib

# Proxmox VE pve-no-subscription repository provided by proxmox.com,
# NOT recommended for production use
deb http://download.proxmox.com/debian/pve bookworm pve-no-subscription

# security updates
deb http://security.debian.org/debian-security bookworm-security main contrib
```

```bash
cat /etc/apt/sources.list.d/pve-enterprise.list
# deb https://enterprise.proxmox.com/debian/pve bookworm pve-enterprise
```

```bash
cat /etc/apt/sources.list.d/ceph.list
# deb https://enterprise.proxmox.com/debian/ceph-quincy bookworm enterprise
deb http://download.proxmox.com/debian/ceph-quincy bookworm no-subscription
```

参考：[Package Repositories](https://pve.proxmox.com/wiki/Package_Repositories)

## パッケージのアップデートとアップグレード

```bash
apt-get -y update && apt-get -y dist-upgrade
```

## ユーザーに2要素認証を設定

Web UIから設定します。

- Datacenter > Permissions > Two Factorを開く
- 画面上部のAdd > TOTPを選択
- QRコードを2要素認証アプリで読み込み、表示された値をVerify Codeに入力
- Addをクリック

ログアウト後に再度ログインし、2要素認証を求められることを確認します。

## SSH公開鍵認証の有効化とパスワード認証の無効化

### Proxmox側

`/etc/ssh/sshd_config`を編集します。

```text
PubkeyAuthentication yes
```

sshdを再起動します。

```bash
systemctl restart sshd
```

### クライアント側

```bash
ssh-keygen -t ed25519 -C "root@pve"
cat id_ed25519.pub
```

### Proxmox側

`/root/.ssh/authorized_keys`に、クライアント側で生成した公開鍵を設定します。

```text
ssh-ed25519 xxxxxxxxxxxxxxxxxxxxxxxxxxxx root@pve
```

### クライアント側

```bash
ssh root@${ホスト名} -i ~/.ssh/${秘密鍵}
```

ログインできない場合は、`.ssh`ディレクトリやその配下のファイルのパーミッションが正しく設定されていることを確認します。

### Proxmox側

再度`/etc/ssh/sshd_config`を編集します。

```text
PasswordAuthentication no
```

sshdを再起動します。

```bash
systemctl restart sshd
```

### クライアント側

パスワードではログインできず、公開鍵ではログインできることを確認します。
