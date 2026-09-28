---
title: Pacman gpg 刷新
tags: [Linux, DevOps]
date: 2020-10-07 00:00:00
---

```bash
pacman-key --init
pacman-key --populate
pacman-key --refresh-keys
pacman -S archlinux-keyring
sudo pacman -Syu
```
