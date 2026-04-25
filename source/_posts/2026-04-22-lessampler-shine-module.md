---
title: 'lessampler: Shine 模块 - 合成管道与 UTAU 集成'
tags: ['lessampler', 'UTAU']
mathjax: true
date: 2026-04-22 00:00:00
---

Shine 模块是 lessampler 的合成管道协调器，负责将 UTAU 的参数传递机制转换为内部变换参数，并驱动整个合成流程。该模块是连接外部接口（UTAU）与内部处理模块（AudioProcess、Synthesis）的关键桥梁。

UTAU 是日本开发的歌声合成软件，使用「resoampler」插件进行音频重采样。lessampler 作为 UTAU 的 resampler 实现，需要解析 UTAU 传递的命令行参数，转换为内部可用的变换参数。

## 模块结构

```
Shine/
├── Shine.h/cpp           # 管道协调器
├── ShinePara.h           # 变换参数结构
└── Binding/
    └── libUTAU/
        ├── libUTAU.h/cpp           # UTAU 参数管理
        ├── UTAUParameterParser.h/cpp  # 命令行参数解析
        ├── PitchBendDecoder.h/cpp    # Pitch Bend 解码
        ├── ScaleConvert.h/cpp        # 音名转频率
        └── FlagsDecoder.h/cpp        # Flags 解码（预留）
```

---

## ShinePara 结构详解

`ShinePara.h` 定义了内部使用的变换参数：

```cpp
class ShinePara {
public:
    // 基础变换参数
    std::string input_file_name = {};
    std::string output_file_name = {};
    int time_percent = 0;            // UTAU 传递的时间百分比
    double velocity = 0.0;           // 计算后的速度系数
    double offset = 0.0;             // 音频偏移（毫秒）
    double required_length = 0.0;    // 目标长度（毫秒）
    int required_frame = 0;          // 目标帧数
    double first_half_fixed_part = 0.0;  // 固定部分长度
    double last_unused_part = 0.0;   // 空白部分长度
    double volumes = 0;              // 音量系数
    int modulation = 0;              // 调制系数（0-100）
    double wave_length = 0.0;        // 原音频长度
    double pre_cross_length = 0.0;   // 预交叉长度
    double base_length = 0.0;        // 基础长度
    double cross_length = 0.0;       // 交叉长度
    double stretch_length = 0.0;     // 拉伸系数
    int output_samples = 0;          // 输出采样数
    double scale_num = 0.0;          // 目标频率（Hz）
    int tempo_num = 0;               // BPM

public:
    // Pitch Bend 参数
    std::vector<int> pitch_bend = {};  // 弯音数组（cents）
    int pitch_length = 0;              // 弯音长度
    int pitch_step = 256;              // 弯音步长

public:
    // 扩展选项（预留）
    bool is_custom_pitch = false;
    bool is_gender = false;
    bool is_breath = false;
    bool is_opening = false;

public:
    // 选项数据
    double gender_value = 0.0;
    double breath_value = 0.0;
    double opening = 0.0;
};
```

**参数分类**：

| 类别 | 参数 | 来源 |
|------|------|------|
| 输入输出 | input_file_name, output_file_name | UTAU 命令行 |
| 时间控制 | offset, required_length, fixed_part, blank_part | UTAU 命令行 |
| 音高控制 | scale_num, pitch_bend, modulation | UTAU 命令行 + 音名转换 |
| 计算参数 | velocity, stretch_length, output_samples | CheckPara 计算 |
| 音量控制 | volumes | UTAU 命令行 |

---

## libUTAU 绑定模块

### UTAUPara 结构

`libUTAU.h` 定义了直接对应 UTAU 参数的结构：

```cpp
class UTAUPara {
public:
    // 基础变换参数（直接对应 argv）
    std::string local_name;         // argv[0] - 程序名
    std::string input_file_name;    // argv[1] - 输入文件
    std::string output_file_name;   // argv[2] - 输出文件
    std::string scale_name;         // argv[3] - 音名（如 C4）
    int time_percent;               // argv[4] - 时间百分比
    double velocity;                // 计算：pow(2, percent/100 - 1)
    std::string flags;              // argv[5] - Flags 字符串
    double offset;                  // argv[6] - 偏移（毫秒）
    double required_length;         // argv[7] - 目标长度（毫秒）
    double first_half_fixed_part;   // argv[8] - 固定部分
    double last_unused_part;        // argv[9] - 空白部分
    double volumes;                 // argv[10] - 音量（百分比）
    int modulation;                 // argv[11] - 调制
    std::string tempo;              // argv[12] - BPM 字符串
    std::string pitch;              // argv[13] - Pitch Bend 字符串

public:
    // 计算参数
    double wave_length = 0.0;
    double pre_cross_length = 0.0;
    double base_length = 0.0;
    double cross_length = 0.0;
    double stretch_length = 0.0;
    int output_samples = 0;
    double scale_num = 0.0;
    int tempo_num = 0;
    bool is_custom_pitch = false;
};
```

### 音频处理概念图

代码注释中的示意图：

```
//  offset   fixed   pre_cross   blank
//|--------|--------|---------|---------| Original Signal
//         |        |          |
//         |   l1   |    l2     |
//         |--------|------------|        Output Signal
// l1  = fixed / velocity         -> base_length
// l2  = pre_cross / stretch      -> cross_length
// l1 + l2 = required_length      -> required_length
```

这是 UTAU 合成的经典模型：
- **固定部分**：不进行拉伸，保持原音色
- **预交叉部分**：用于拉伸/压缩，连接下一音符
- **空白部分**：不使用的尾部

---

## UTAUParameterParser 类

### 命令行参数解析

UTAU 通过命令行参数将合成请求传递给 resoampler：

```cpp
UTAUParameterParser::UTAUParameterParser(int argc, char *argv[]) {
    // argv[0]: 程序名
    utauPara.local_name = argv[0];

    // argv[1]: 输入文件路径
    utauPara.input_file_name = argv[1];

    // argv[2]: 输出文件路径
    utauPara.output_file_name = argv[2];

    // argv[3]: 音名（如 C4、D#5）
    utauPara.scale_name = argv[3];
    ScaleConvert scaleConvert(utauPara.scale_name);
    utauPara.scale_num = scaleConvert.GetScaleNum();

    // argv[4]: 时间百分比 → velocity
    if (argc > 4) {
        std::istringstream sstream(argv[4]);
        sstream >> utauPara.time_percent;
        utauPara.velocity = pow(2, utauPara.time_percent / 100.0 - 1.0);
    }

    // argv[5]: Flags 字符串
    if (argc > 5) {
        std::istringstream sstream(argv[5]);
        sstream >> utauPara.flags;
    }

    // argv[6]: 偏移（毫秒）
    if (argc > 6) {
        std::istringstream sstream(argv[6]);
        sstream >> utauPara.offset;
    }

    // argv[7]: 目标长度（毫秒）
    if (argc > 7) {
        std::istringstream sstream(argv[7]);
        sstream >> utauPara.required_length;
    }

    // argv[8]: 固定部分长度
    if (argc > 8) {
        std::istringstream sstream(argv[8]);
        sstream >> utauPara.first_half_fixed_part;
    }

    // argv[9]: 空白部分长度
    if (argc > 9) {
        std::istringstream sstream(argv[9]);
        sstream >> utauPara.last_unused_part;
    }

    // argv[10]: 音量百分比
    if (argc > 10) {
        std::istringstream sstream(argv[10]);
        sstream >> utauPara.volumes;
        utauPara.volumes *= 0.01;  // 转换为系数
    }

    // argv[11]: 调制系数
    if (argc > 11) {
        std::istringstream sstream(argv[11]);
        sstream >> utauPara.modulation;
    }

    // argv[12]: BPM（可能带 ! 前缀）
    if (argc > 12) {
        std::istringstream sstream(argv[12]);
        sstream >> utauPara.tempo;
        if (utauPara.tempo.find('!') != std::string::npos) {
            utauPara.tempo_num = std::stoi(utauPara.tempo.substr(1));
        } else {
            utauPara.tempo_num = std::stoi(utauPara.tempo.substr(2));
        }
    }

    // argv[13]: Pitch Bend 字符串
    if (argc > 13) {
        utauPara.is_custom_pitch = true;
        std::istringstream sstream(argv[13]);
        sstream >> utauPara.pitch;
    }
}
```

**参数对照表**：

| argv 索引 | 参数名 | 格式示例 | 处理方式 |
|-----------|--------|----------|----------|
| 0 | 程序名 | lessampler.exe | 直接存储 |
| 1 | 输入文件 | input.wav | 直接存储 |
| 2 | 输出文件 | output.wav | 直接存储 |
| 3 | 音名 | C4, D#5 | ScaleConvert 转 Hz |
| 4 | 时间百分比 | 100 | pow(2, value/100 - 1) |
| 5 | Flags | B0H10 | 待实现 |
| 6 | 偏移 | 50.0 | 直接解析 |
| 7 | 目标长度 | 200.0 | 直接解析 |
| 8 | 固定部分 | 50.0 | 直接解析 |
| 9 | 空白部分 | 20.0 | 直接解析 |
| 10 | 音量 | 100 | × 0.01 |
| 11 | 调制 | 50 | 直接解析 |
| 12 | BPM | !120 或 AA120 | 解析数字 |
| 13 | Pitch Bend | AA#10#BB | PitchBendDecoder |

---

## ScaleConvert 类：音名转频率

### 算法实现

```cpp
bool ScaleConvert::ScaleConvertToDouble(std::string scaleName) {
    int bias = 0;

    // 检测是否为升号（#）
    if (scaleName[1] == '#') {
        bias = 1;
    }

    // 音名偏移计算（相对于 A）
    int scale;
    switch (scaleName[0]) {
        case 'C': scale = -9 + bias; break;
        case 'D': scale = -7 + bias; break;
        case 'E': scale = -5; break;        // 无升号
        case 'F': scale = -4 + bias; break;
        case 'G': scale = -2 + bias; break;
        case 'A': scale = bias; break;
        case 'B': scale = 2; break;         // 无升号
        default: return false;
    }

    // 计算八度数（相对于 A4）
    double octave = scaleName[1 + bias] - '0' - 4;

    // 频率计算公式：A4 = 440Hz
    scaleNum = pow(2.0, octave) * pow(2.0, scale / 12.0) * 440.0;

    return true;
}
```

**数学公式**：

$$f = 440 \times 2^{octave} \times 2^{\frac{semitone}{12}}$$

其中：
- $440 \text{ Hz}$ = A4 的标准频率
- $octave$ = 目标八度 - 4
- $semitone$ = 目标音名相对于 A 的半音偏移

**示例计算**：

| 音名 | $octave$ | $semitone$ | 计算过程 | 结果 |
|------|----------|------------|----------|------|
| C4 | 0 | -9 | $440 \times 2^0 \times 2^{-9/12}$ | 261.63 Hz |
| A4 | 0 | 0 | $440 \times 2^0 \times 2^0$ | 440 Hz |
| C5 | 1 | -9 | $440 \times 2^1 \times 2^{-9/12}$ | 523.25 Hz |
| D#4 | 0 | -6 | $440 \times 2^0 \times 2^{-6/12}$ | 311.13 Hz |

---

## PitchBendDecoder 类：弯音解码

### UTAU Pitch Bend 编码格式

UTAU 使用一种特殊的 Base64 变体编码 Pitch Bend：

**字符映射表**：

| 字符范围 | 数值 |
|----------|------|
| A-Z | 0-25 |
| a-z | 26-51 |
| 0-9 | 52-61 |
| + | 62 |
| / | 63 |

每个 Pitch Bend 值由两个字符编码：

$$value = char_1 \times 64 + char_2$$

**有符号转换**：
- 值 $\leq 2047$：正值
- 值 $> 2047$：负值（$value - 4096$）

### GetDataFromUTAU64() 函数

```cpp
int PitchBendDecoder::GetDataFromUTAU64(char i) {
    if (i >= '0' && i <= '9') {
        return i - '0' + 52;
    } else if (i >= 'A' && i <= 'Z') {
        return i - 'A';
    } else if (i >= 'a' && i <= 'z') {
        return i - 'a' + 26;
    } else if (i == '+') {
        return 62;
    } else if (i == '/') {
        return 63;
    } else {
        return 0;
    }
}
```

### PitchBendDecode() 函数

```cpp
void PitchBendDecoder::PitchBendDecode() {
    int i, n = 0;
    int k = 0, num, ii;
    std::stringstream ss;
    char *str = const_cast<char *>(pitch.c_str());

    for (i = 0; i < pitch_string_length; i += 2) {
        if (str[i] == '#') {
            // Run-Length Encoding: #N# 表示重复前值 N 次
            i++;
            ss << pitch.substr(pitch.find('#', i - 1) + 1, 
                pitch.find('#', i + pitch.find('#')) - 1);
            ss >> num;
            for (ii = 0; ii < num && k < count; ii++) {
                pitch_bend[k++] = n;
            }
            while (str[i] != '#' && str[i] != 0)
                i++;
            i--;
        } else {
            // 正常解码
            n = GetDataFromUTAU64(str[i]) * 64 
                + GetDataFromUTAU64(str[i + 1]);
            if (n > 2047)
                n -= 4096;  // 转为负值
            if (k < count) {
                pitch_bend[k++] = n;
            }
        }
    }
}
```

**解码示例**：

| 字符串 | 解码过程 | 结果数组 |
|--------|----------|----------|
| AA | 0×64+0=0 | [0] |
| BB | 1×64+1=65 | [65] |
| zz | 51×64+51=3315 → 3315-4096=-781 | [-781] |
| AA#10#AA | 0, 重复10次, 0 | [0,0,0,0,0,0,0,0,0,0,0,0] |

**Pitch Bend 值含义**：
- 单位：cents（音分）
- 10 cents = 1 半音
- 1200 cents = 1 倍频
- 0 = 无偏移（基准音高）

---

## libUTAU::CheckPara() 参数验证

```cpp
void libUTAU::CheckPara(const lessAudioModel& audioModel) {
    // 计算原音频长度（毫秒）
    utauPara.wave_length = static_cast<double>(audioModel.x.size()) 
        / static_cast<double>(audioModel.fs) * 1000;

    // 处理负的 blank 值（从音频末尾计算）
    if (utauPara.last_unused_part < 0) {
        utauPara.last_unused_part = utauPara.wave_length 
            - utauPara.offset + utauPara.last_unused_part;
        if (utauPara.last_unused_part < 0)
            utauPara.last_unused_part = 0;
    }

    // 验证：offset + blank 不能超过音频长度
    if (utauPara.offset + utauPara.last_unused_part >= utauPara.wave_length)
        throw parameter_error("音频偏移和空白超过音频长度");

    // 验证：固定部分不能超过可用音频
    if (utauPara.offset + utauPara.last_unused_part + utauPara.first_half_fixed_part >= utauPara.wave_length)
        utauPara.first_half_fixed_part = utauPara.wave_length 
            - utauPara.offset + utauPara.last_unused_part;

    // 计算预交叉长度
    utauPara.pre_cross_length = utauPara.wave_length 
        - utauPara.offset 
        - utauPara.first_half_fixed_part 
        - utauPara.last_unused_part;

    // 计算基础长度（固定部分除以 velocity）
    utauPara.base_length = utauPara.first_half_fixed_part / utauPara.velocity;

    // 计算交叉长度
    utauPara.cross_length = utauPara.required_length - utauPara.base_length;

    // 验证：预交叉长度不能为负
    if (utauPara.pre_cross_length <= 0 && utauPara.cross_length > 0)
        throw parameter_error("输入音频长度不足以进行交叉变换");

    // 计算拉伸系数
    utauPara.stretch_length = utauPara.pre_cross_length / utauPara.cross_length;

    // 限制拉伸系数不超过 1.0
    if (utauPara.stretch_length > 1.0)
        utauPara.stretch_length = 1.0;

    // 计算输出采样数
    utauPara.output_samples = static_cast<int>(utauPara.required_length * 0.001 * audioModel.fs) + 1;
}
```

**计算公式总结**：

| 参数 | 公式 | 说明 |
|------|------|------|
| $wave\_length$ | $\frac{x.size()}{fs} \times 1000$ | 音频长度（毫秒） |
| $pre\_cross$ | $wave\_length - offset - fixed - blank$ | 可用于拉伸的部分 |
| $base\_length$ | $\frac{fixed}{velocity}$ | 固定部分的输出长度 |
| $cross\_length$ | $required - base\_length$ | 拉伸部分的输出长度 |
| $stretch$ | $\frac{pre\_cross}{cross\_length}$ | 拉伸系数 |
| $output\_samples$ | $required \times 0.001 \times fs + 1$ | 输出采样数 |

---

## Shine 类：管道协调

### 构造函数

```cpp
Shine::Shine(int argc, char *argv[], const lessAudioModel &audioModel, SHINE_MODE mode) {
    if (mode == SHINE_MODE::UTAU) {
        // 解析 UTAU 参数
        libUTAU utau(argc, argv);

        // 验证并计算参数
        utau.CheckPara(audioModel);

        // 设置 ShinePara
        SetShine(utau.GetUTAUPara(), utau.GetUTAUFlags(), audioModel);
    }
}
```

### SetShine() 参数转换

```cpp
void Shine::SetShine(const UTAUPara &utau_para, UTAUFlags utau_flags, 
    const lessAudioModel &audioModel) {
    // 复制基础参数
    shine_para.input_file_name = utau_para.input_file_name;
    shine_para.output_file_name = utau_para.output_file_name;
    shine_para.time_percent = utau_para.time_percent;
    shine_para.velocity = utau_para.velocity;
    shine_para.offset = utau_para.offset;
    shine_para.required_length = utau_para.required_length;
    shine_para.first_half_fixed_part = utau_para.first_half_fixed_part;
    shine_para.last_unused_part = utau_para.last_unused_part;
    shine_para.volumes = utau_para.volumes;
    shine_para.modulation = utau_para.modulation;
    shine_para.wave_length = utau_para.wave_length;
    shine_para.pre_cross_length = utau_para.pre_cross_length;
    shine_para.base_length = utau_para.base_length;
    shine_para.cross_length = utau_para.cross_length;
    shine_para.stretch_length = utau_para.stretch_length;
    shine_para.output_samples = utau_para.output_samples;
    shine_para.scale_num = utau_para.scale_num;
    shine_para.tempo_num = utau_para.tempo_num;
    shine_para.is_custom_pitch = utau_para.is_custom_pitch;

    // 解码 Pitch Bend
    DecodePitchBend(audioModel.fs, audioModel.frame_period, utau_para.pitch);
}
```

### DecodePitchBend() 弯音处理

```cpp
void Shine::DecodePitchBend(int fs, double frame_period, std::string pitch) {
    // 默认 BPM
    if (shine_para.tempo_num == 0)
        shine_para.tempo_num = 120;

    if (shine_para.is_custom_pitch) {
        // 计算 Pitch Bend 采样步长
        shine_para.pitch_step = static_cast<int>(lround(
            60.0 / 96.0 / shine_para.tempo_num * fs));

        // 计算 Pitch Bend 长度
        shine_para.pitch_length = shine_para.output_samples / shine_para.pitch_step + 1;

        // 解码 Pitch Bend 字符串
        PitchBendDecoder pitchBendDecoder(pitch, shine_para.pitch_length);
        shine_para.pitch_bend = std::move(pitchBendDecoder.GetPitchBend());
    } else {
        // 无自定义弯音：填充零
        shine_para.pitch_bend.resize(shine_para.pitch_length + 1);
        std::fill(shine_para.pitch_bend.begin(), shine_para.pitch_bend.end(), 0);
    }

    // 计算目标帧数
    shine_para.required_frame = static_cast<int>(
        1000.0 * shine_para.output_samples / fs / frame_period) + 1;
}
```

**Pitch Step 计算**：

$$pitch\_step = \frac{60.0}{96.0 \times tempo} \times fs$$

其中：
- $60.0$：每分钟秒数
- $96.0$：UTAU 的 Pitch Bend 采样密度（每拍 96 个点）
- $tempo$：BPM
- $fs$：采样率

---

## 完整合成流程

```
UTAU 命令行参数 (argc, argv)
         │
         ▼
    ┌────────────────┐
    │ libUTAU        │
    │  ├─ Parser     │ 解析 argv
    │  ├─ ScaleConv  │ 音名 → Hz
    │  └─ CheckPara  │ 计算参数
    └────────────────┘
         │
         ▼
    UTAUPara
         │
         ▼
    ┌────────────────┐
    │ Shine          │
    │  ├─ SetShine   │ 参数转换
    │  └─ DecodePitch│ Pitch Bend 解码
    └────────────────┘
         │
         ▼
    ShinePara
         │
         ▼
    ┌────────────────┐
    │ AudioProcess   │ 音频变换
    └────────────────┘
         │
         ▼
    ┌────────────────┐
    │ Synthesis      │ 合成波形
    └────────────────┘
         │
         ▼
    ┌────────────────┐
    │ AutoAMP        │ 振幅调整
    └────────────────┘
         │
         ▼
    输出 WAV 文件
```

---

## 使用示例

```cpp
#include "Shine/Shine.h"

// UTAU 调用方式
// lessampler.exe input.wav output.wav C4 100 "" 0 200 50 20 100 50 !120 AA

int main(int argc, char *argv[]) {
    // 加载音频模型
    lessAudioModel audioModel = LoadAudioModel(argv[1]);

    // 创建 Shine 管道
    Shine shine(argc, argv, audioModel, Shine::SHINE_MODE::UTAU);
    ShinePara params = shine.GetShine();

    // 使用参数进行音频处理
    AudioProcess processor(audioModel, params);
    lessAudioModel transformed = processor.GetTransAudioModel();

    // 合成并输出
    Synthesis synth(transformed, params.output_samples);
    AutoAMP amp(params, synth.GetWavData());

    WavIO::WriteWav(params.output_file_name, amp.GetAMP(), 
        params.output_samples, audioModel.fs);
}
```

