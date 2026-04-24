---
title: 'RISC-V 基础体系架构'
tags: ['RISC-V', 'ISA']
date: 2026-04-19 00:00:00
---

# RISC-V 基础体系架构

## 1. 架构介绍、寄存器、函数调用规范与栈

### 1.1 架构介绍

#### 1.1.1 RISC-V由来

**RISC（Reduced Instruction Set Computer）**：精简指令集计算机，通过减少指令集数量和复杂度来提高性能和效率。

RISC-V是由加州大学伯克利分校开发的**开源指令集架构**，特点如下：

| 特性     | 说明                    |
| -------- | ----------------------- |
| 开放性   | BSD开源协议，无需授权费 |
| 简洁性   | 指令集精简，易于理解    |
| 可扩展   | 支持自定义扩展指令      |
| 商业可用 | 可应用于商业场景        |

#### 1.1.2 RISC与CISC对比

| 特性       | RISC（精简指令集） | CISC（复杂指令集） |
| ---------- | ------------------ | ------------------ |
| 指令数量   | 少，固定长度       | 多，可变长度       |
| 指令复杂度 | 低，单周期执行     | 高，多周期执行     |
| 寄存器数量 | 多                 | 少                 |
| 硬件复杂度 | 低                 | 高                 |
| 编译器优化 | 容易               | 困难               |

#### 1.1.3 RISC-V与ARM对比

| 特性         | RISC-V             | ARM                  |
| ------------ | ------------------ | -------------------- |
| 指令集数量   | 精简               | 丰富                 |
| 指令集宽度   | 支持128位扩展      | 最高64位（v8-A）     |
| 指令复杂度   | 汇编简单易懂       | 相对复杂             |
| 执行效率     | 注重效率和功耗优化 | 注重通用性和兼容性   |
| 微操作数量   | 一般单微操作       | 不固定，部分多微操作 |
| 开放程度     | BSD开源，无需授权  | 需授权，闭源         |
| 功耗性能优化 | 发展阶段，逐步完善 | 已广泛优化           |

#### 1.1.4 RISC-V指令集模块

**模块化ISA**：RISC-V采用模块化设计，处理器可选择实现需要的扩展模块。

**增量型ISA**（传统方式）：新处理器需实现所有历史扩展以保持向后兼容。

RISC-V指令集分类：

| 类别           | 标识 | 说明           |
| -------------- | ---- | -------------- |
| 基本整数指令集 | I    | 完整整数指令集 |
| 精简整数指令集 | E    | 嵌入式场景     |
| 整数整除指令集 | M    | 乘除运算       |
| 原子操作指令集 | A    | 原子内存操作   |
| 单精度浮点     | F    | 32位浮点       |
| 双精度浮点     | D    | 64位浮点       |
| 压缩指令集     | C    | 16位压缩指令   |

**命名示例**：`rv64imac` 表示64位架构，包含I/M/A/C扩展。

#### 1.1.5 玄铁系列处理器实例

| 系列              | 特点        | 代表型号                 |
| ----------------- | ----------- | ------------------------ |
| C系列（高性能）   | 高性能处理  | C906/C907/C908/C910/C920 |
| E系列（超低能耗） | MCU级低功耗 | E902/E906/E907           |
| R系列（可靠实时） | 实时增强    | R910                     |

### 1.2 寄存器

#### 1.2.1 通用寄存器

64位架构提供**32个64位通用寄存器**（x0-x31），32位架构为32个32位寄存器。

| 寄存器 | 别名  | 用途                | 备注                            |
| ------ | ----- | ------------------- | ------------------------------- |
| x0     | zero  | 固定为0             | 编译器优化用途                  |
| x1     | ra    | 返回地址            | 保存函数返回地址（类似ARM的LR） |
| x2     | sp    | 栈指针              | 指向栈顶地址                    |
| x3     | gp    | 全局指针            | 编译器优化，指向全局数据区      |
| x4     | tp    | 线程指针            | 存放task_struct指针             |
| x5     | t0    | 临时寄存器          | 函数调用不需保存                |
| x6     | t1    | 临时寄存器          | 函数调用不需保存                |
| x7     | t2    | 临时寄存器          | 函数调用不需保存                |
| x8     | s0/fp | 保存寄存器/栈帧指针 | 函数调用需保存，类似ARM的FP     |
| x9     | s1    | 保存寄存器          | 函数调用需保存                  |
| x10    | a0    | 参数/返回值         | 第1个参数，函数返回值           |
| x11    | a1    | 参数/返回值         | 第2个参数，函数返回值           |
| x12    | a2    | 参数寄存器          | 第3个参数                       |
| x13    | a3    | 参数寄存器          | 第4个参数                       |
| x14    | a4    | 参数寄存器          | 第5个参数                       |
| x15    | a5    | 参数寄存器          | 第6个参数                       |
| x16    | a6    | 参数寄存器          | 第7个参数                       |
| x17    | a7    | 参数寄存器          | 第8个参数                       |
| x18    | s2    | 保存寄存器          | 函数调用需保存                  |
| x19    | s3    | 保存寄存器          | 函数调用需保存                  |
| x20    | s4    | 保存寄存器          | 函数调用需保存                  |
| x21    | s5    | 保存寄存器          | 函数调用需保存                  |
| x22    | s6    | 保存寄存器          | 函数调用需保存                  |
| x23    | s7    | 保存寄存器          | 函数调用需保存                  |
| x24    | s8    | 保存寄存器          | 函数调用需保存                  |
| x25    | s9    | 保存寄存器          | 函数调用需保存                  |
| x26    | s10   | 保存寄存器          | 函数调用需保存                  |
| x27    | s11   | 保存寄存器          | 函数调用需保存                  |
| x28    | t3    | 临时寄存器          | 函数调用不需保存                |
| x29    | t4    | 临时寄存器          | 函数调用不需保存                |
| x30    | t5    | 临时寄存器          | 函数调用不需保存                |
| x31    | t6    | 临时寄存器          | 函数调用不需保存                |

**寄存器分类说明**：

| 类型         | 寄存器           | 调用约定                           |
| ------------ | ---------------- | ---------------------------------- |
| 临时寄存器   | t0-t6            | 调用者保存，函数可随意使用         |
| 保存寄存器   | s0-s11           | 被调用者保存，函数使用前需保存到栈 |
| 参数寄存器   | a0-a7            | 传递函数参数                       |
| 返回值寄存器 | a0-a1            | 保存函数返回值                     |
| 特殊寄存器   | zero/ra/sp/gp/tp | 有固定用途                         |

#### 1.2.2 系统寄存器（CSR）

**mepc/sepc**：在M模式和S模式下处理trap时，记录原程序发生trap时的地址。

**mtval**：Machine Trap Value，辅助软件进行trap处理。

- 当trap为断点、地址错位、访问错误、页错误时，写入出错的虚拟地址
- 与mepc配合：mepc保存导致异常的指令地址，mtval保存访问的虚拟地址

### 1.3 函数调用规范

#### 1.3.1 调用规范要点

| 序号 | 规范                                                    |
| ---- | ------------------------------------------------------- |
| 1    | 前8个参数使用a0-a7寄存器传递，超过8个则使用栈传递       |
| 2    | 参数小于寄存器宽度时，先按符号扩展到32位，再扩展到64位  |
| 3    | 128位参数使用一对寄存器传递                             |
| 4    | 返回值保存到a0和a1寄存器                                |
| 5    | 返回地址保存在ra寄存器                                  |
| 6    | 使用s0-s11寄存器需先保存到栈，使用后恢复                |
| 7    | 栈向下增长，sp需对齐到16字节边界                        |
| 8    | 使用"-fno-omit-frame-pointer"编译选项时，s0作为栈帧指针 |

#### 1.3.2 栈帧结构

函数栈布局（栈向下增长）：

| 区域     | 内容               | 位置          |
| -------- | ------------------ | ------------- |
| 参数区   | 超过8个的参数      | SP偏移0处开始 |
| 保存区   | s0-s11等保存寄存器 | 参数区上方    |
| 局部变量 | 函数局部变量       | 保存区上方    |
| 返回地址 | ra寄存器值         | 局部变量上方  |

**栈操作指令**：

RISC-V没有专门的push/pop指令，使用addi替代：

```asm
addi sp, sp, -32    // 栈向下扩展32字节
addi sp, sp, 32     // 栈向上收缩32字节
```

#### 1.3.3 传参示例

C代码：

```c
#include <stdio.h>

int main(void)
{
    printf("data: %d, %d, %d, %d, %d, %d, %d, %d, %d, %d\n",
           1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
    return 0;
}
```

汇编代码（GCC生成）：

```asm
    .file   "test2.c"
    .option nopic
    .text
    .section        .rodata
    .align  3
.LC0:
    .string "data: %d, %d, %d, %d, %d, %d, %d, %d, %d, %d\n"
    .text
    .align  1
    .align  4
    .globl  main
    .type   main, @function
main:
    addi    sp, sp, -48       // 分配栈空间
    sd      ra, 40(sp)        // 保存返回地址
    sd      s0, 32(sp)        // 保存栈帧指针
    addi    s0, sp, 48        // 设置栈帧基址
    li      a5, 10            // 第10个参数
    sd      a5, 16(sp)        // 存入栈
    li      a5, 9             // 第9个参数
    sd      a5, 8(sp)         // 存入栈
    li      a5, 8             // 第8个参数
    sd      a5, 0(sp)         // 存入栈
    li      a7, 7             // a7传递第7个参数
    li      a6, 6             // a6传递第6个参数
    li      a5, 5             // a5传递第5个参数
    li      a4, 4             // a4传递第4个参数
    li      a3, 3             // a3传递第3个参数
    li      a2, 2             // a2传递第2个参数
    li      a1, 1             // a1传递第1个参数
    lui     a0, %hi(.LC0)     // a0传递字符串地址
    addi    a0, a0, %lo(.LC0)
    call    printf            // 调用printf
    li      a5, 0
    mv      a0, a5            // 返回值0
    ld      ra, 40(sp)        // 恢复返回地址
    ld      s0, 32(sp)        // 恢复栈帧指针
    addi    sp, sp, 48        // 收回栈空间
    jr      ra                // 返回
```

**解析**：前8个参数通过a1-a7寄存器传递，第8-10个参数通过栈传递。

#### 1.3.4 函数跳转示例

C代码：

```c
#include <stdio.h>

static int test = 0;

int func2(void)
{
    int a = 0;
    return 0;
}

int func1(void)
{
    int b = 0;
    func2();
    return 0;
}

int main(void)
{
    int a = 0, b = 1, c = 2, d = 3, e = 4, f = 5, g = 6, h = 7, i = 8, j = 9;
    b = a + a;
    func1();
    return 0;
}
```

汇编代码：

```asm
    .file   "test.c"
    .option nopic
    .text
    .local  test
    .comm   test, 4, 4
    .align  1
    .align  4
    .globl  func2
    .type   func2, @function
func2:
    addi    sp, sp, -32       // 分配栈空间
    sd      s0, 24(sp)        // 保存s0（叶函数不保存ra）
    addi    s0, sp, 32        // 设置栈帧
    sw      zero, -20(s0)     // 局部变量a=0
    li      a5, 0
    mv      a0, a5            // 返回值
    ld      s0, 24(sp)        // 恢复s0
    addi    sp, sp, 32        // 收回栈
    jr      ra                // 返回

func1:
    addi    sp, sp, -32
    sd      ra, 24(sp)        // 保存ra（非叶函数需保存）
    sd      s0, 16(sp)        // 保存s0
    addi    s0, sp, 32
    sw      zero, -20(s0)     // 局部变量b=0
    call    func2             // 调用func2
    li      a5, 0
    mv      a0, a5
    ld      ra, 24(sp)        // 恢复ra
    ld      s0, 16(sp)        // 恢复s0
    addi    sp, sp, 32
    jr      ra

main:
    addi    sp, sp, -64       // 分配64字节栈空间
    sd      ra, 56(sp)        // 保存ra
    sd      s0, 48(sp)        // 保存s0
    addi    s0, sp, 64
    sw      zero, -20(s0)     // a=0
    li      a5, 1
    sw      a5, -24(s0)       // b=1
    li      a5, 2
    sw      a5, -28(s0)       // c=2
    ...                       // 其他局部变量初始化
    lw      a5, -20(s0)
    slliw   a5, a5, 1         // b = a + a
    sw      a5, -24(s0)
    call    func1             // 调用func1
    li      a5, 0
    mv      a0, a5
    ld      ra, 56(sp)
    ld      s0, 48(sp)
    addi    sp, sp, 64
    jr      ra
```

**解析**：

- func2是叶函数（不调用其他函数），无需保存ra
- func1是非叶函数，需保存ra
- main函数分配较大栈空间存放多个局部变量

---

## 2. RISC-V指令集

RISC-V ISA分为两部分：

- **非特权指令**：用户态（低权限模式）可执行的指令，用于通用计算
- **特权指令**：运行现代操作系统所需，用于资源管控

### 2.1 特权级ISA

#### 2.1.1 特权等级

| 特权模式         | 缩写 | 权限级别         | 主要用途           |
| ---------------- | ---- | ---------------- | ------------------ |
| User/Application | U    | 最低             | 用户程序运行       |
| Supervisor       | S    | 中等             | 操作系统内核       |
| Reserved         | H    | -                | 虚拟化扩展         |
| Machine          | M    | 最高（强制实现） | 启动配置、底层控制 |
| Debug            | D    | 可高于M          | 调试模式           |

**各模式权限差异**：

| 权限类型   | U模式     | S模式     | M模式 |
| ---------- | --------- | --------- | ----- |
| 寄存器访问 | 受限      | 中等      | 完全  |
| 特权指令   | 禁止      | 部分      | 完全  |
| 内存访问   | 受PMP限制 | 受PMP限制 | 完全  |

**典型Linux系统**：

- 用户态应用：U模式
- 内核：S模式
- OpenSBI/U-Boot：M模式

#### 2.1.2 特权指令

| 指令       | 功能            | 说明                             |
| ---------- | --------------- | -------------------------------- |
| ECALL      | 产生同步异常    | 用于U/S模式陷入M模式（系统调用） |
| EBREAK     | 产生断点异常    | 用于跳转到Debug模式              |
| mret       | 从M模式异常返回 | 恢复M模式上下文                  |
| sret       | 从S模式异常返回 | 恢复S模式上下文                  |
| uret       | 从U模式异常返回 | 恢复U模式上下文                  |
| sfence.vma | 刷新TLB         | 刷新当前hart的TLB                |
| WFI        | 等待中断        | hart暂停直到有中断待处理         |

**FENCE指令族**：

| 指令    | 功能     | 说明                               |
| ------- | -------- | ---------------------------------- |
| FENCE   | 内存屏障 | 保证前后内存操作顺序对外可见       |
| FENCE.I | 指令屏障 | 保证I$和D$一致性（自修改代码场景） |

**CSR读写指令**：

| 指令  | 功能              | 示例                      |
| ----- | ----------------- | ------------------------- |
| csrr  | 读CSR到通用寄存器 | `csrr t0, mstatus`        |
| csrw  | 写CSR             | `csrw mstatus, t0`        |
| csrs  | CSR指定bit置1     | `csrsi mstatus, (1 << 2)` |
| csrc  | CSR指定bit置0     | `csrci mstatus, (1 << 2)` |
| csrrw | 读CSR并写入新值   | `csrrw t0, mstatus, t0`   |
| csrrs | 读CSR并置指定bit  | -                         |
| csrrc | 读CSR并清指定bit  | -                         |

### 2.2 异常与中断

#### 2.2.1 异常分类

| 类型             | 定义             | 示例                  |
| ---------------- | ---------------- | --------------------- |
| 同步异常         | 执行指令直接导致 | 非法指令、ECALL、断点 |
| 异步异常（中断） | 与当前指令无关   | 外部中断、定时器中断  |

**Trap术语**：

- **自陷（trap）**：异常导致控制权转移给处理程序
- **垂直自陷**：提升特权等级的自陷
- **水平自陷**：保持原有特权等级的自陷

#### 2.2.2 异常处理流程

**异常发生时CPU硬件自动执行**：

| 步骤 | 操作                                     |
| ---- | ---------------------------------------- |
| 1    | 保存当前PC到mepc寄存器                   |
| 2    | 将异常类型写入mcause寄存器               |
| 3    | 将异常相关虚拟地址写入mtval寄存器        |
| 4    | 保存中断状态：MIE→MPIE（mstatus寄存器）  |
| 5    | 保存处理器模式到MPP字段（mstatus寄存器） |
| 6    | 关闭本地中断：设置MIE=0                  |
| 7    | 设置处理器模式为M模式                    |
| 8    | 跳转到异常向量表：mtvec值→PC             |

**异常返回时mret自动执行**：

| 步骤 | 操作                         |
| ---- | ---------------------------- |
| 1    | 恢复中断使能：MPIE→MIE       |
| 2    | 恢复处理器模式：MPP→当前模式 |
| 3    | 返回异常现场：mepc→PC        |

**操作系统异常处理流程**：

| 步骤 | 操作                             |
| ---- | -------------------------------- |
| 1    | 保存上下文（通用寄存器+CSR）到栈 |
| 2    | 查询mcause，跳转对应处理程序     |
| 3    | 执行异常/中断处理                |
| 4    | 恢复栈中的上下文                 |
| 5    | 执行mret返回                     |

#### 2.2.3 异常向量表

异常处理入口：

```
trap_init    : /arch/riscv/kernel/traps.c
    -> csr_write(CSR_STVEC, &handle_exception);
```

异常总入口处理分支：

```
handle_exception    : /arch/riscv/kernel/entry.S
    -> 根据scause判断异常类型
        -> do_irq（中断处理）
        -> handle_syscall（系统调用）
        -> excp_vect_table（各类异常）
```

异常向量表内容：

| 向量号 | 异常类型       | 处理函数                 |
| ------ | -------------- | ------------------------ |
| 0      | 指令地址未对齐 | do_trap_insn_misaligned  |
| 1      | 指令访问错误   | do_trap_insn_fault       |
| 2      | 非法指令       | do_trap_insn_illegal     |
| 3      | 断点           | do_trap_break            |
| 4      | 加载地址未对齐 | do_trap_load_misaligned  |
| 5      | 加载访问错误   | do_trap_load_fault       |
| 6      | 存储地址未对齐 | do_trap_store_misaligned |
| 7      | 存储访问错误   | do_trap_store_fault      |
| 8      | U模式ECALL     | do_trap_ecall_u          |
| 9      | S模式ECALL     | do_trap_ecall_s          |
| 11     | M模式ECALL     | do_trap_ecall_m          |
| 12     | 指令页错误     | do_page_fault            |
| 13     | 加载页错误     | do_page_fault            |
| 15     | 存储页错误     | do_page_fault            |

#### 2.2.4 异常托管（委托）

默认所有异常/中断在M模式处理。通过委托机制可交由S模式处理，减少模式切换开销。

委托寄存器：

| 寄存器  | 功能         |
| ------- | ------------ |
| mideleg | 中断委托配置 |
| medeleg | 异常委托配置 |

### 2.3 CSR寄存器

#### 2.3.1 CSR地址编码

CSR地址编码规则（12位地址）：

| 位段    | 含义                               |
| ------- | ---------------------------------- |
| [11:10] | 读写权限（00/01=读写，10/11=只读） |
| [9:8]   | 可访问最低特权等级                 |

**注意**：RISC-V不使用CSR影子寄存器（ARM中同一编码在不同异常等级表示不同物理寄存器）。

#### 2.3.2 U模式CSR

| 地址  | 名称     | 功能               |
| ----- | -------- | ------------------ |
| 0x000 | ustatus  | 用户状态寄存器     |
| 0x004 | uie      | 用户中断使能       |
| 0x005 | utvec    | 用户异常向量表基址 |
| 0x040 | uscratch | 用户scratch        |
| 0x041 | uepc     | 用户异常PC         |
| 0x042 | ucause   | 用户异常原因       |
| 0x043 | utval    | 用户异常值         |
| 0x044 | uip      | 用户中断pending    |

#### 2.3.3 S模式CSR

| 地址  | 名称     | 功能                   |
| ----- | -------- | ---------------------- |
| 0x100 | sstatus  | 超级用户状态寄存器     |
| 0x104 | sie      | 超级用户中断使能       |
| 0x105 | stvec    | 超级用户异常向量表基址 |
| 0x140 | sscratch | 超级用户scratch        |
| 0x141 | sepc     | 超级用户异常PC         |
| 0x142 | scause   | 超级用户异常原因       |
| 0x143 | stval    | 超级用户异常值         |
| 0x144 | sip      | 超级用户中断pending    |

**sstatus寄存器位域**：

| 字段 | 位   | 说明                            |
| ---- | ---- | ------------------------------- |
| SIE  | BIT1 | 使能S模式下的中断               |
| SPIE | BIT5 | 临时保存的中断使能状态（S模式） |
| SPP  | BIT8 | 异常之前的特权模式（S模式异常） |

#### 2.3.4 M模式CSR

| 地址  | 名称     | 功能               |
| ----- | -------- | ------------------ |
| 0x300 | mstatus  | 机器状态寄存器     |
| 0x304 | mie      | 机器中断使能       |
| 0x305 | mtvec    | 机器异常向量表基址 |
| 0x340 | mscratch | 机器scratch        |
| 0x341 | mepc     | 机器异常PC         |
| 0x342 | mcause   | 机器异常原因       |
| 0x343 | mtval    | 机器异常值         |
| 0x344 | mip      | 机器中断pending    |
| 0x302 | medeleg  | 异常委托           |
| 0x303 | mideleg  | 中断委托           |

**mstatus寄存器位域**：

| 字段 | 位         | 说明                            |
| ---- | ---------- | ------------------------------- |
| SIE  | BIT1       | 使能S模式下的中断               |
| MIE  | BIT3       | 使能M模式下的中断               |
| SPIE | BIT5       | 临时保存的中断使能状态（S模式） |
| MPIE | BIT7       | 临时保存的中断使能状态（M模式） |
| SPP  | BIT8       | 异常之前的特权模式（S模式异常） |
| MPP  | BIT[12:11] | 异常之前的特权模式（M模式异常） |

**要点**：mstatus的MIE/SIE是中断总开关，mie/sie是每类中断的具体开关。建议先开具体中断，再开总开关。

**mtvec寄存器位域**：

| 字段 | 位             | 说明                             |
| ---- | -------------- | -------------------------------- |
| BASE | BIT[MXLEN-1:2] | 异常向量表基地址                 |
| MODE | BIT[1:0]       | 向量模式：0=直接访问，1=向量访问 |

**向量模式说明**：

- 直接访问模式：软件读取mcause后跳转对应处理函数
- 向量访问模式：硬件根据mcause自动跳转到BASE+4\*exception_code

**mcause寄存器位域**：

| 字段           | 位             | 说明           |
| -------------- | -------------- | -------------- |
| Interrupt      | BIT[MXLEN-1]   | 1=中断，0=异常 |
| Exception Code | BIT[MXLEN-2:0] | 异常/中断编号  |

**mideleg寄存器委托位**：

| 字段 | 位     | 说明                  |
| ---- | ------ | --------------------- |
| SSIP | BIT[1] | 将软件中断委托给S模式 |
| STIP | BIT[5] | 将时钟中断委托给S模式 |

### 2.4 非特权级ISA

非特权指令是用户模式下可执行的指令集，包括：

- 算术运算和逻辑操作
- 数据传输（加载/存储）
- 分支和跳转指令

---

## 3. 中断与异常

### 3.1 中断硬件基础

RISC-V支持两种中断类型：

| 类型     | 控制器 | 中断源               | 特点                       |
| -------- | ------ | -------------------- | -------------------------- |
| 本地中断 | CLINT  | 软件中断、定时器中断 | 直接发送给单个hart，无仲裁 |
| 全局中断 | PLIC   | 所有外设             | 可路由到任意hart，需仲裁   |

#### 3.1.1 CLINT（本地中断控制器）

提供两种本地中断：

- **软件中断（SSIP）**：用于核间通信
- **定时器中断（STIP）**：用于定时器事件

#### 3.1.2 PLIC（平台级中断控制器）

**PLIC关键特性**：

| 特性             | 说明                                         |
| ---------------- | -------------------------------------------- |
| 中断源Gateway    | 每个中断源有独立Gateway，PLIC维护pending bit |
| 中断请求不可取消 | Gateway发出请求后无法取消                    |
| 优先级配置       | 每个中断源可配置优先级，0表示屏蔽            |
| 阈值机制         | 优先级大于阈值才发起处理请求                 |

**中断数据流**：

| 步骤 | 操作                                               |
| ---- | -------------------------------------------------- |
| 1    | Gateway发出Interrupt Request信号给PLIC             |
| 2    | PLIC设置IP（Interrupt Pending）bit                 |
| 3    | CPU收到Interrupt Notification，发送Claim请求到PLIC |
| 4    | PLIC返回中断ID，清除对应IP bit                     |
| 5    | CPU处理中断                                        |
| 6    | CPU发送Completion信号给Gateway                     |
| 7    | Gateway允许下一个中断进入                          |

**不同触发方式处理**：

| 触发方式 | 处理流程                                |
| -------- | --------------------------------------- |
| 电平触发 | 设备拉低电平→Gateway转换→等待Completion |
| 边缘触发 | Gateway收到信号即产生request            |

### 3.2 Vector模式

Andes实现的Vector模式流程：

| 步骤 | 操作                                 |
| ---- | ------------------------------------ |
| 1    | PLIC获取中断信号                     |
| 2    | PLIC转换得出中断号，通知CPU          |
| 3    | CPU硬件自动响应，回信号给PLIC        |
| 4    | CPU根据中断号自动跳转到中断向量表    |
| 5    | 中断处理完成后，软件通知PLIC处理完毕 |

### 3.3 中断路由

默认所有异常/中断在M模式响应。通过OpenSBI配置委托后，部分中断/异常路由到S模式。

**委托配置**：

| 类型 | 委托项                                               |
| ---- | ---------------------------------------------------- |
| 中断 | SSIP（软件中断）、STIP（时钟中断）、SEIP（外部中断） |
| 异常 | 地址非对齐、断点、U模式ECALL                         |

**代码流程**：

```
sbi_init
    -> sbi_hart_init
        -> sbi_hart_reinit
            -> delegate_traps
                -> interrupts = MIP_SSIP | MIP_STIP | MIP_SEIP
                -> exceptions = (1U << CAUSE_MISALIGNED_FETCH) |
                                (1U << CAUSE_BREAKPOINT) |
                                (1U << CAUSE_USER_ECALL)
```

### 3.4 中断代码流程

一级中断控制器注册：

```
一级中断控制器："riscv,cpu-intc"
    -> rc = set_handle_irq(&riscv_intc_irq)
        -> handle_arch_irq = riscv_intc_irq
```

中断处理流程：

```
handle_exception    : /arch/riscv/kernel/entry.S
    -> 根据scause判断异常类型
        -> do_irq
            -> handle_arch_irq = riscv_intc_irq
                -> generic_handle_domain_irq(regs->cause)
                    -> desc->handle_irq(desc)
```

**说明**：hwirq号即mcause寄存器的值，对应RISC-V异常向量号。

---

## 4. Cache原理

RISC-V官方仅定义`FENCE.I`指令用于cache flush，各厂商有自定义实现。

### 4.1 Cache写机制

| 机制          | 操作方式                   | 优点           | 缺点       |
| ------------- | -------------------------- | -------------- | ---------- |
| Write Through | 写cache时同步写内存        | 简单，数据一致 | 速度慢     |
| Post Write    | 写入更新缓冲器，延迟写内存 | 速度提升       | 缓冲区有限 |
| Write Back    | 标记脏位，替换时才写内存   | 效率高         | 实现复杂   |

### 4.2 实现示例（Andes-A27L2）

#### 4.2.1 Fence操作

| 操作 | 说明                          |
| ---- | ----------------------------- |
| CCTL | Cache Control寄存器和操作方法 |

#### 4.2.2 芯片初始化

初始化代码：

```c
unsigned long long mcache_ctl_val = csr_read(CSR_MCACHE_CTL);
unsigned long long mmisc_ctl_val = csr_read(CSR_MMISC_CTL);

mcache_ctl_val |= (V5_MCACHE_CTL_DC_COHEN_EN |
                   V5_MCACHE_CTL_IC_EN |
                   V5_MCACHE_CTL_DC_EN |
                   V5_MCACHE_CTL_CCTL_SUEN |
                   V5_MCACHE_CTL_L1I_PREFETCH_EN |
                   V5_MCACHE_CTL_L1D_PREFETCH_EN |
                   V5_MCACHE_CTL_DC_WAROUND_1_EN |
                   V5_MCACHE_CTL_L2C_WAROUND_1_EN);

csr_write(CSR_MCACHE_CTL, mcache_ctl_val);

// 等待DC_COHSTA置位
mcache_ctl_val = csr_read(CSR_MCACHE_CTL);
if ((mcache_ctl_val & V5_MCACHE_CTL_DC_COHEN_EN)) {
    while (!(mcache_ctl_val & V5_MCACHE_CTL_DC_COHSTA_EN))
        mcache_ctl_val = csr_read(CSR_MCACHE_CTL);
}

mmisc_ctl_val |= V5_MMISC_CTL_NON_BLOCKING_EN;
csr_write(CSR_MMISC_CTL, mmisc_ctl_val);
```

#### 4.2.3 开启Cache

**开L1 Cache**：

```c
asm volatile (
    "csrr t1, 0x7ca\n\t"
    "ori t0, t1, 0x2\n\t"
    "csrw 0x7ca, t0\n\t"
);
// 或使用SBI调用
sbi_ecall(SBI_EXT_ANDES, SBI_EXT_ANDES_DCACHE_OP, 1, 0, 0, 0, 0, 0);
```

**开L2 Cache**：

```c
writel(0x49000008, BIT(0));
writel(readl((void *)0x49000008) | 0x1, (void *)0x49000008);
```

#### 4.2.4 刷Cache接口

```c
flush_dcache_all // inval + wb
{
    csr_write(CCTL_REG_MCCTLCOMMAND_NUM, CCTL_L1D_WBINVAL_ALL);

    volatile struct l2cache *regs = gd->arch.l2c;
    u8 hart = gd->arch.boot_hart;
    void __iomem *cctlcmd = (void __iomem *)CCTL_CMD_REG(regs, hart);
    void __iomem *cctlstat = (void __iomem *)CCTL_STATUS_REG(regs, hart);

    if (regs) {
        writel(L2_WBINVAL_ALL, cctlcmd);
        while (readl(cctlstat) & CCTL_STATUS_MSK(hart)) {
            if (readl(cctlstat) & CCTL_STATUS_ILLEGAL(hart)) {
                printf("L2 flush illegal! hanging...");
                hang();
            }
        }
    }
}
```

#### 4.2.5 MSB机制

由于MMU机制限制，PTE中没有标记page是否cache的bit。引入MSB机制：物理地址最高位作为no-cache标记。

**示例**：`0x8000a000` 表示 `0xa000` 地址的no-cache映射。

---

## 5. Machine Timer

S模式下的timer事件路由到S模式执行。

### 5.1 Timer初始化

```
plmt_cold_timer_init
    -> sbi_timer_set_device
```

### 5.2 Timer写操作

写timer调用SBI接口：

```
sbi_ecall_time_handler(SBI_EXT_TIME_SET_TIMER)
    -> sbi_timer_event_start
```

### 5.3 Timer读操作

读timer触发异常，在SBI中捕获并处理：

```
sbi_illegal_insn_handler
    -> illegal_insn_table[28]: system_opcode_insn
        -> sbi_emulate_csr_read
            -> sbi_timer_virt_value:
                case CSR_TIME: sbi_timer_virt_value()/sbi_timer_value()
                case CSR_TIMEH: sbi_timer_virt_value/sbi_timer_value
```

---

## 6. 编译工具链

### 6.1 处理器架构命名

以`rv32imac`为例：

| 前缀 | 含义           |
| ---- | -------------- |
| rv   | RISC-V架构     |
| 32   | 32位架构       |
| i    | 基本整数指令集 |
| m    | 乘法指令集     |
| a    | 原子操作指令集 |
| c    | 压缩指令集     |

**其他位宽**：rv64（64位）、rv128（128位）

### 6.2 Andes工具链

| 工具链前缀  | 用途           | 说明                     |
| ----------- | -------------- | ------------------------ |
| nds32-elf   | 嵌入式裸机开发 | 无操作系统，直接运行硬件 |
| nds32-linux | Linux系统开发  | 构建内核和用户空间应用   |

### 6.3 Xuantie工具链

| 工具链前缀    | 用途           | 说明                     |
| ------------- | -------------- | ------------------------ |
| riscv64-elf   | 嵌入式裸机开发 | 无操作系统，直接运行硬件 |
| riscv64-linux | Linux系统开发  | 构建内核和用户空间应用   |

---

## 参考文献

- https://tinylab.org/riscv-privileged/
- The_RISC-V_Instruction_Set_Manual_Volume_I_User-Level_ISA_TD001_V2.2.pdf
- The_RISC-V_Instruction_Set_Manual_Volume_II_Privileged_Architecture_TD002_V1.10.pdf
- https://tinylab.org/cpu-design-part1-riscv-privilleged-instruction/
- https://blog.csdn.net/zhangshangjie1/article/details/135003940
- https://blog.csdn.net/u011011827/article/details/125387460
