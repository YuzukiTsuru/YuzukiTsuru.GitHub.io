---
title: 'BuildRoot 与 RasperryPi'
cover: /images/post/2020-02-02-20200202/cover.jpg
date: 2020-02-02 00:00:00
tags: [BuildRoot, RaspberryPi, Kernel, 内核]
---

> Buildroot是一款使用交叉编译来简化和自动化为嵌入式系统构建完整Linux系统的过程的工具。
>
> 为了实现这一点，Buildroot能够为您的目标生成一个交叉编译工具链，一个根文件系统，一个Linux内核映像和一个引导加载程序。Buildroot还可以独立和任意组合（例如，您可以使用现有的交叉编译工具链，并仅使用Buildroot构建您的根文件系统）。

## 下载你需要的BuildRoot源代码

打开 [Buildroot - Making Embedded Linux Easy](https://buildroot.org/download.html) 网站，找到你需要的版本，我这里使用的是`2019.11.1`这个版本，是我现在的最新版本。

在终端运行这些命令：

```bash
wget -o buildroot.tar.gz https://buildroot.org/downloads/buildroot-2019.11.1.tar.gz
tar xvf buildroot.tar.gz
```

## 开始编译

先下载基础工具链

```bash
sudo apt-get install build-essential
```

然后使用

```bash
make list-defconfigs
```

来查看编译需要使用的版本，在显示出来的内容中，你会看到：

```bash
raspberrypi2_defconfig - Build for raspberrypi2
raspberrypi3_defconfig - Build for raspberrypi3
raspberrypi4_defconfig - Build for raspberrypi4
raspberrypi_defconfig - Build for raspberrypi
```

我使用的是RaspberryPi 3B+ 所以我选择`raspberrypi3_defconfig`选项

```bash
make raspberrypi3_defconfig
```

然后，使用BuildRoot的工具来构建需要使用的工具链然后进行编译

```bash
make all
```

喝一杯🍵，慢慢等吧

输出文件在`output`文件夹里

> 参考资料：
>
> https://blog.csdn.net/bin_zhang1/article/details/80734466.
