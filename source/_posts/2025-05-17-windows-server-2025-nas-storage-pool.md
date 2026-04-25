---
title: 'Windows Server 2025 更换 NAS 存储池中的磁盘'
tags: ['NAS', 'Windows Server']
date: 2025-05-17 00:00:00
---

最近 NAS 掉盘了，无法正常使用，需要更换一块磁盘。

先看一下坏的盘

```powershell
Get-PhysicalDisk | Where-Object –Property HealthStatus –ne Healthy
```

![image-20250517092336041](../images/post/2025-05-17-windows-server-2025-nas-storage-pool/image-20250517092336041.png)

新盘插入之后加入存储池中，之后需要运行命令将坏的盘退休

```powershell
$FailedDisk = Get-PhysicalDisk | Where-Object –Property HealthStatus –ne Healthy
$FailedDisk | Set-PhysicalDisk –Usage Retired
```

![image-20250517092438671](../images/post/2025-05-17-windows-server-2025-nas-storage-pool/image-20250517092438671.png)

然后需要重建磁盘库，点击修复磁盘库

![image-20250517092454435](../images/post/2025-05-17-windows-server-2025-nas-storage-pool/image-20250517092454435.png)

等待修复完成，删除损坏的盘
