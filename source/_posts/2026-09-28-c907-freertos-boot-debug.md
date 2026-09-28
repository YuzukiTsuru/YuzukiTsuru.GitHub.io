---
title: 记一次 T-Head C907 上 FreeRTOS "上电即崩" 的排查
date: 2026-09-28 00:00:00
tags: [Allwinner, RISC-V, FreeRTOS, Debug]
---

## 背景

一块 Allwinner F101 板子(核是 T-Head C907,RV32),跑 FreeRTOS。开发时不用 boot0/SPL 从 flash 启动,而是直接用 **xfel(FES)** 和 **GDB + CKLink** 把镜像怼进内存运行。

现象:**上电即崩,串口一行输出都没有。**

排查过程比较曲折,最后定位到两个独立的问题,都挺有代表性,记一下。

## 环境

| 项 | 版本 |
|---|---|
| SoC | Allwinner F101(`AWUSBFEX ID=0x00193700`) |
| 核 | T-Head C907,RV32ACDFIMSUVX |
| 工具链 | XTGccElfNewlib V3.2.0 |
| 调试器 | CKLink-Lite(固件 App_ver 3.5)+ XT-DebugServer V5.18.5 |
| 加载工具 | xfel v1.3.6 |

---

## 问题一:PMP 把代码段锁成了不可执行

### 现象

GDB 挂上去,PC 停在 `mtvec` 的第一条指令上:

```
pc      = 0x40000100        ← 等于 mtvec,trap handler 入口
mcause  = 0x1               ← Instruction access fault
mepc    = 0x40000100
mtval   = 0x40000100
```

`mepc == mtval == mtvec`,说明**连异常入口都取不到指**,已经陷入二次 fault 死循环。

### 定位

读 `pmpcfg0`,一眼就看出问题:

```
pmpcfg0   = 0x00898b88
pmpaddr0  = 0x8000        → 0x20000
pmpaddr1  = 0x10000000    → 0x40000000
pmpaddr2  = 0x10004000    → 0x40010000
```

把 `pmpcfg0` 按 8 位拆开:

| entry | cfg | 含义 |
|---|---|---|
| 0 | `0x88` | L=1, A=TOR, 无权限 |
| 1 | `0x8b` | L=1, A=TOR, R+X |
| 2 | `0x89` | L=1, A=TOR, **R only** |

`CONFIG_PMP_USE_TOR_MODE=y`,TOR 模式下 region 是**连续**的,所以实际布局是:

| region | 范围 | 权限 |
|---|---|---|
| 0 | `[0x00000000, 0x00020000)` | 无 |
| 1 | `[0x00020000, 0x40000000)` | R+X |
| 2 | **`[0x40000000, 0x40010000)`** | **R only,且 L=1 锁定** |

而 `_start`、trap handler(`0x40000100`)、`pmp_enable()`(`0x400031c4`)—— **全都在这 64KB 里**。

`pmp_enable()` 逐条写 PMP entry 并加 `PMP_L` 锁定。执行到 `i=2`、把 `pmpcfg2` 写成 `0x89` 的那一刻,自己所在的这段内存变成"只读、不可执行、已锁定",**下一条指令取指立刻 fault**;跳去 `mtvec` 取指又 fault(handler 也在同一段);而且 `L=1` 复位前无法解除。

### 根因

`CONFIG_ARCH_START_ADDRESS` 被本地改成了 `0x40000000`,和 `CONFIG_SYS_CONFIG_PACK_ADDRESS=0x40000000` 撞在一起:

```c
/* arch/risc-v/sun252iw2/sun252i.c */
#ifdef CONFIG_SYS_CONFIG_PACK
    /*sys_config: 0x40000000~0x40010000, 64K size*/
    pmp_add_region(CONFIG_SYS_CONFIG_PACK_ADDRESS,
        CONFIG_SYS_CONFIG_PACK_ADDRESS + CONFIG_SYS_CONFIG_PACK_DATA_SIZE, PMP_R);   // 只读
#endif

    /* code region */
    pmp_add_region((unsigned long)__text_start__,
                    (unsigned long)__etext, PMP_R | PMP_X);                          // R|X
```

sys_config 区先注册,code 区后注册,两者**完全重叠**。`mem_region_add()` 合并/切分之后,重叠部分保留了先注册的"只读",**code 区的 X 被吃掉了**。

对比其他板子的配置,一目了然:

| board | `CONFIG_ARCH_START_ADDRESS` | 结果 |
|---|---|---|
| f101s3/evb1、f101s3/pro、f101s3/evb1_hal_v2、f101s2/evb1 | `0x40010000` | ✅ 不重叠 |
| **f101s3/yuzukineko** | **`0x40000000`**(本地未提交改动) | ❌ 完全重叠 |

而建板提交 `add yuzukineko board` 里,这个值**本来是 `0x40010000`**。

### 修复

改回 `0x40010000`,重新编译。改完后实测新 PMP 表:

```
PMP 4: TOR L [0x40010000 - 0x4014A000) : R X : pmpaddr:0x10052800 prot:0x8d
```

**代码区重新有了 X,`pmp_enable()` 顺利通过。**

---

## 问题二:sys_config pack 缺失

PMP 修好后不再死循环了,但串口依然没有任何输出。用 GDB 单步追:

```
_start  →  start_kernel  →  prvSetupHardware  →  pmp_init ✅  →  hal_cfg_init ❌
```

崩在 `hal_cfg_init()`:

```
EXC_LOAD_ACCESS
mcause = 0x5            ← Load access fault
mepc   = 0x400173ac
mtval  = 0x6d82d820     ← 一个荒唐的越界地址
```

出错指令:

```asm
400173a8:  mul     a4,a1,a3        # a4 = (a1-1) * 40
400173ac:  th.lrw  a4,s0,a4,0      # 读 *(s0 + a4) → fault
```

backtrace:

```
#1  script_parser_init (script_buf=0x40000030, @entry=0x40000000)
#2  __init_sys_config (data_start_addr=0x40000000, data_size=0x10000)
#3  init_sys_config
#4  hal_cfg_init
#5  prvSetupHardware
#6  start_kernel
#7  _start
```

直接读 `0x40000000`:

```
0x40000000:  0x01234567  0x01234568  0x01234569  0x0123456a
0x40000010:  0x0123456b  0x0123456c  0x0123456d  0x0123456e
```

**递增的测试图样** —— 这是 PSRAM 上电后的残留,不是 sys_config pack。

### 根因

`hal_cfg_init()` 会去 `CONFIG_SYS_CONFIG_PACK_ADDRESS`(`0x40000000`)读 sys_config pack 并解析。正常启动流程里,**这一步由 boot0/SPL 完成**:它从 flash 的 sys_config 分区把 pack 读到 `0x40000000`,然后才跳 RTOS。

而用 xfel/GDB 直接怼 RTOS,这一步没人做。解析器拿到一片垃圾,从里面读出一个荒唐的偏移量,于是 `s0 + a4 = 0x6d82d820` → 越界 → load access fault。

### 修复

把打包好的 sys_config pack 也写进去:

```
xfel write 0x40000000 out/f101s3/yuzukineko/image/config.fex
```

`config.fex` 是 `sys_config.fex` 打包后的二进制形式(`image.cfg` 里 subtype 为 `SYS_CONFIG_BIN00`),头部特征很明显:

```
000000: 31 00 00 00   ← 49,条目数
        00 58 00 00   ← 0x5800 = 22528,正好是文件自身大小
        01 00 00 00
        02 00 00 00
000010: "product"     ← 第一个 section 名
```

### 结果

```
** Welcome to F101_C907 FreeRTOS V1.6.0 **
SystemInit Done: cost 37262 us
free run success!
```

---

## 过程中踩到的几个坑

这几点比具体 bug 更值得记,因为不知道的话会在错误的方向上浪费很多时间。

### 1. xfel(FES)和 JTAG 调试器是互斥的

两者都要控制同一个核,必须**严格分先后**:

| 板子状态 | xfel 可用? | GDB 可用? |
|---|---|---|
| 刚上电,停在 BROM/FES | ✅ | 部分 |
| DebugServer 持有核(halt) | ❌ 报 `No FEL device found` | ✅ |
| RTOS 已经跑起来 | ❌ | ✅ |

正确的顺序是:**先全程用 xfel 把内存准备好,再让调试器接管**。不要交叉操作。

### 2. PMP 一旦锁定,调试器也写不进去

PMP entry 带上 `L=1` 后无法修改。而 RISC-V 调试器的 abstract command 做内存访问时,是**代替 hart 执行 load/store,同样受 PMP 约束**。

当时的现象很有迷惑性:

```
(gdb) restore C:/Users/gloom/config.fex binary 0x40000000
Restoring binary file ... into memory (0x40000000 to 0x40005800)

(gdb) x/4xw 0x40000000
0x40000000: 0x01234567 0x01234568 ...     ← 还是旧值!
```

`restore` 报成功、读回来却没变 —— 因为 `[0x40000000, 0x40010000)` 是 **R-only + L**,**读得到、写不进**。

**结论:sys_config pack 必须在 RTOS 跑起来(PMP 配置)之前写入。**

### 3. 读未初始化的 DRAM 会把 DebugServer 搞挂

PSRAM 未初始化时读 `0x40000000`,会看到:

```
ERROR: After reading memory region with start_addr 0x40000000,
       end_addr 0x40000004 gets ABSTRACTCS.busy == 1 ...
Connection to CPU 0 is lost
```

`ABSTRACTCS.busy` 卡死、连接直接断开。**校验内存请用 `xfel hexdump`(走 FES,不碰调试器),不要用 GDB 读 DRAM。**

---

## 附:sys_config 能不能和 bin 打在一起?

**当前布局下不能,但可以手工拼。**

```
0x40000000 ┌──────────────────────┐
           │ sys_config pack 64K  │  ← CONFIG_SYS_CONFIG_PACK_ADDRESS
0x40010000 ├──────────────────────┤
           │ rt_system.bin (1.3MB)│  ← CONFIG_ARCH_START_ADDRESS / 入口
0x4015BBF8 └──────────────────────┘
```

`rt_system.bin` 是 flat binary,**只能从自己的链接地址开始连续排布**。它从 `0x40010000` 起,物理上无法包含 `0x40000000` 的内容。正常流程里这本来就是两个独立固件项,由 boot0/SPL 分别加载。

想合成一个镜像,按"pack 在前、RTOS 在后"拼即可:

```
config.fex 补齐到 65536 字节  ||  rt_system.bin   →  combined.bin

xfel write 0x40000000 combined.bin
xfel exec  0x40010000          ← 注意入口是 0x40010000,不是 0x40000000
```

这样一次 `write` 就够。本质上就是把 boot0 做的事情搬到主机侧。

> 也正因如此,**最初那个 `ARCH_START=0x40000000` 的改动才那么致命** —— 它等于让 RTOS 镜像直接压进了 sys_config pack 的槽位,然后被 PMP 锁死。

---

## 附:SPI NOR 的报错不是问题

启动日志里还有一段看着吓人的报错:

```
spinor: spinor info magic err!, magic: ծʪ꺪@
spinor: boot_param header magic err!, magic:
[E] spif_boot_try_delay_param()710 - spif update delay param error
spinor: enable write failed
spinor: write lock all failed
spinor: init nor flash failed
```

这个是**预期行为** —— 这条加载路径下本来就没有 boot_param 分区,读不到 magic 是正常的。不是 bug。

（顺带一提,`init nor flash failed` 之后确实还跟着一次空指针崩溃:`mcause=0x5, mtval=0x2c`,是读 `NULL->field_0x2C`,说明调用方没判 `spinor` 初始化失败的返回值。这个和本次的两个根因无关,是独立的小问题。）

---

## 小结

| 问题 | 根因 | 修复 |
|---|---|---|
| 上电即崩、无输出 | `ARCH_START` 与 `SYS_CONFIG_PACK_ADDRESS` 撞车,PMP 把 `.text` 锁成不可执行 | `ARCH_START` 改回 `0x40010000` |
| 修好后仍无输出 | xfel/GDB 直载镜像时,没人把 sys_config pack 放到 `0x40000000` | 加载前 `xfel write 0x40000000 config.fex` |

两个问题都出在**"绕过了正常启动流程"**这件事上:一旦不用 boot0/SPL,它默默做的两件事(建立正确的 PMP 地址布局、加载 sys_config pack)就都得自己补上。
