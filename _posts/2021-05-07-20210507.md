---
layout: post
title: fastboot 刷写 boot 分区错误 error: Couldn’t parse partition size ‘0x’
tags: ['boot',  'android', 'android-flash']
---

由于 `adb` 的更新，原生的 `boot` 分区刷写模式已经不适合使用，目前需要使用 `flash:raw` 进行刷写


  ```bash
  fastboot flash boot boot.img
  ```
  
  替换为：
  
  ```bash
  fastboot flash:raw boot boot.img
  ```


如果设备的 `boot` 分区被分割为 `boot_a`, `boot_b` 

  ```bash
  fastboot flash:raw boot_a boot.img
  fastboot flash:raw boot_b boot.img
  ```
