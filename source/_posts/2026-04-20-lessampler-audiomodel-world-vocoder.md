---
title: 'lessampler: AudioModel 模块 - WORLD 声码器的 C++ 封装'
tags: ['lessampler', 'UTAU']
date: 2026-04-20 00:00:00
---

AudioModel 模块是 lessampler 的核心音频处理模块，负责对原始音频进行分析和合成。该模块封装了著名的 WORLD 声码器库，提供了高质量的歌声分析和重建能力。

WORLD 是由日本名古屋工业大学开发的声码器，能够将语音信号分解为三个基本成分：
- **F0（基频）**：音高轮廓曲线
- **频谱包络**：音色特征，包含共振峰信息
- **非周期性**：噪声成分，描述声音的清浊音特性

这种分解方式使得我们可以独立修改音高、音色和噪声特性，这是歌声合成器的基础能力。

## 模块结构

```
AudioModel/
├── AudioModel.h/cpp       # 门面类，协调分析与数据转换
├── lessAudioModel.h       # STL 安全的数据结构定义
├── WorldModule/
│   ├── WorldModule.h/cpp  # WORLD 分析封装
│   └── WorldPara.h        # 分析参数数据结构
└── Synthesis/
    └── Synthesis.h/cpp    # WORLD 合成封装
```

---

## 数据结构详解

### WorldPara 结构体

`WorldPara.h` 定义了 WORLD 分析的原始输出结构，使用 C 风格指针：

```cpp
typedef struct WorldPara_ {
    double frame_period = 5.0;   // 帧周期（毫秒）
    int fs = 0;                  // 采样率
    
    double *f0 = nullptr;        // F0 数组（每帧的基频）
    double *time_axis = nullptr; // 时间轴（每帧对应的时间点）
    int f0_length = 0;           // 帧数
    
    double **spectrogram = nullptr;     // 频谱包络（二维数组）
    double **aperiodicity = nullptr;     // periodicity（二维数组）
    int fft_size = 0;                   // FFT 大小
} WorldPara;
```

**关键字段解析**：

| 字段 | 含义 | 用途 |
|------|------|------|
| `frame_period` | 分析帧间隔 | 决定时间分辨率，默认 5ms |
| `f0` | 基频数组 | 存储每帧的基频值（Hz），0 表示静音 |
| `spectrogram` | 频谱包络 | 每帧的频谱幅度，维度为 `[f0_length][fft_size/2+1]` |
| `aperiodicity` | 非周期性 | 每帧的噪声比例，值范围 0~1 |

### lessAudioModel 结构体

`lessAudioModel.h` 提供了 STL 容器安全版本，便于 C++ 代码使用：

```cpp
typedef struct lessAudioModel_ {
    double frame_period = 0.0;
    int fs = 0;
    int w_length = 0;        // fft_size / 2 + 1
    int fft_size = 0;

    std::vector<double> x;                           // 原始音频
    std::vector<double> f0;                          // F0 轮廓
    std::vector<double> time_axis;                   // 时间轴
    std::vector<std::vector<double>> spectrogram;    // 频谱包络
    std::vector<std::vector<double>> aperiodicity;   // 非周期性
} lessAudioModel;
```

**设计考虑**：
- 使用 `std::vector` 替代原始指针，避免手动内存管理
- 自动支持 RAII（资源获取即初始化）
- 与 STL 算法无缝集成

---

## WorldModule 类详解

WorldModule 是音频分析的核心类，将原始 PCM 数据转换为 WORLD 参数。

### 构造函数流程

```cpp
WorldModule::WorldModule(double *x, int x_length, int fs, lessConfigure config) {
    // 1. 设置基本参数
    this->worldPara.fs = fs;
    this->worldPara.frame_period = configure.audio_model_frame_period;

    // 2. F0 估计（根据配置选择算法）
    if (configure.f0_mode == F0_MODE_DIO) {
        F0EstimationDio();
    } else if (configure.f0_mode == F0_MODE_HARVEST) {
        F0EstimationHarvest();
    }

    // 3. 频谱包络估计
    SpectralEnvelopeEstimation();

    // 4. 非周期性估计
    AperiodicityEstimation();
}
```

### F0EstimationDio() 函数

DIO 算法是 WORLD 提供的快速 F0 估计方法：

```cpp
void WorldModule::F0EstimationDio() {
    DioOption option = {0};
    InitializeDioOption(&option);

    // 设置帧周期
    option.frame_period = this->worldPara.frame_period;

    // 降采样比例（1=最高精度，越大越快）
    option.speed = configure.f0_speed;

    // F0 下限频率
    option.f0_floor = configure.f0_dio_floor;  // 默认 40Hz
    option.allowed_range = configure.f0_allow_range;

    // 计算帧数并分配内存
    this->worldPara.f0_length = GetSamplesForDIO(
        this->worldPara.fs, x_length, this->worldPara.frame_period);
    this->worldPara.f0 = new double[this->worldPara.f0_length];
    this->worldPara.time_axis = new double[this->worldPara.f0_length];
    auto *refined_f0 = new double[this->worldPara.f0_length];

    // 执行 DIO 算法
    Dio(x, x_length, this->worldPara.fs, &option, 
        this->worldPara.time_axis, this->worldPara.f0);

    // StoneMask 精化（提高估计精度）
    StoneMask(x, x_length, this->worldPara.fs, 
        this->worldPara.time_axis, this->worldPara.f0, 
        this->worldPara.f0_length, refined_f0);

    // 使用精化后的 F0
    for (int i = 0; i < this->worldPara.f0_length; ++i) {
        this->worldPara.f0[i] = refined_f0[i];
    }

    delete[] refined_f0;
}
```

**DIO 算法原理**：
- 使用基于时域的方法估计 F0
- 通过降采样提高计算效率
- `StoneMask` 是一个后处理步骤，进一步修正 F0 值

### F0EstimationHarvest() 函数

Harvest 是更精确但更慢的 F0 估计算法：

```cpp
void WorldModule::F0EstimationHarvest() {
    HarvestOption option = {0};
    InitializeHarvestOption(&option);

    option.frame_period = this->worldPara.frame_period;
    option.f0_floor = configure.f0_harvest_floor;  // 默认 40Hz

    this->worldPara.f0_length = GetSamplesForHarvest(
        this->worldPara.fs, x_length, this->worldPara.frame_period);
    this->worldPara.f0 = new double[this->worldPara.f0_length];
    this->worldPara.time_axis = new double[this->worldPara.f0_length];

    Harvest(x, x_length, this->worldPara.fs, &option, 
        this->worldPara.time_axis, this->worldPara.f0);
}
```

**Harvest 与 DIO 的对比**：

| 特性 | DIO | Harvest |
|------|-----|---------|
| 计算速度 | 快 | 慢 |
| 精度 | 中等 | 高 |
| 适用场景 | 实时处理 | 高质量离线分析 |

### SpectralEnvelopeEstimation() 函数

频谱包络估计使用 CheapTrick 算法：

```cpp
void WorldModule::SpectralEnvelopeEstimation() {
    CheapTrickOption option = {0};
    InitializeCheapTrickOption(this->worldPara.fs, &option);

    // F0 下限影响频谱包络的低频分辨率
    option.f0_floor = configure.f0_cheap_trick_floor;  // 默认 71Hz

    // FFT 大小：自定义或自动计算
    option.fft_size = [&]() {
        if (configure.custom_fft_size) {
            return configure.fft_size;
        } else {
            return GetFFTSizeForCheapTrick(this->worldPara.fs, &option);
        }
    }();

    this->worldPara.fft_size = option.fft_size;

    // 分配频谱包络内存
    this->worldPara.spectrogram = new double *[this->worldPara.f0_length];
    for (int i = 0; i < this->worldPara.f0_length; ++i) {
        this->worldPara.spectrogram[i] = new double[this->worldPara.fft_size / 2 + 1];
    }

    CheapTrick(x, x_length, this->worldPara.fs, 
        this->worldPara.time_axis, this->worldPara.f0, 
        this->worldPara.f0_length, &option, this->worldPara.spectrogram);
}
```

**CheapTrick 算法要点**：
- FFT 大小决定了频谱分辨率：`fft_size/2 + 1` 个频率点
- F0 下限决定最低可分析的基频
- 公式：最低 F0 = `3.0 * fs / fft_size`

### AperiodicityEstimation() 函数

非周期性估计使用 D4C 算法：

```cpp
void WorldModule::AperiodicityEstimation() {
    D4COption option = {0};
    InitializeD4COption(&option);

    // 阈值决定清浊音判定灵敏度
    option.threshold = configure.ap_threshold;  // 默认 0.10

    // 分配非周期性内存
    this->worldPara.aperiodicity = new double *[this->worldPara.f0_length];
    for (int i = 0; i < this->worldPara.f0_length; ++i) {
        this->worldPara.aperiodicity[i] = new double[this->worldPara.fft_size / 2 + 1];
    }

    D4C(x, x_length, this->worldPara.fs, 
        this->worldPara.time_axis, this->worldPara.f0, 
        this->worldPara.f0_length, this->worldPara.fft_size, 
        &option, this->worldPara.aperiodicity);
}
```

**非周期性参数含义**：
- 值为 0：完全周期性（纯清音）
- 值为 1：完全非周期性（纯浊音/噪声）
- 阈值用于判断帧是否为静音或浊音段

---

## Synthesis 类详解

Synthesis 类负责从 WORLD 参数重建音频波形。

### SynthesisWav() 函数

使用 WORLD 的实时合成 API：

```cpp
void Synthesis::SynthesisWav() const {
    WorldSynthesizer synthesizer = {0};
    int buffer_size = 64;  // 每次合成 64 个采样

    InitializeSynthesizer(audioModel.fs, audioModel.frame_period,
        audioModel.fft_size, buffer_size, 100, &synthesizer);

    // 将 vector 数据转换为 C 数组
    auto f0 = new double[audioModel.f0.size()];
    std::copy(audioModel.f0.begin(), audioModel.f0.end(), f0);

    auto spectrogram = new double *[audioModel.f0.size()];
    auto aperiodicity = new double *[audioModel.f0.size()];
    for (int i = 0; i < audioModel.f0.size(); ++i) {
        spectrogram[i] = new double[audioModel.w_length];
        aperiodicity[i] = new double[audioModel.w_length];
        std::copy(audioModel.spectrogram[i].begin(), 
            audioModel.spectrogram[i].end(), spectrogram[i]);
        std::copy(audioModel.aperiodicity[i].begin(), 
            audioModel.aperiodicity[i].end(), aperiodicity[i]);
    }

    // 流式合成
    int offset = 0;
    for (int i = 0; i < audioModel.f0.size();) {
        // 添加一帧参数
        if (AddParameters(&f0[i], 1, &spectrogram[i], 
            &aperiodicity[i], &synthesizer) == 1) {
            ++i;
        }

        // 合成并填充输出缓冲区
        while (Synthesis2(&synthesizer) != 0) {
            int index = offset * buffer_size;
            for (int j = 0; j < buffer_size; ++j)
                x[j + index] = synthesizer.buffer[j];
            offset++;
        }

        // 检查锁定状态
        if (IsLocked(&synthesizer) == 1) {
            YALL_WARN_ << "Synthesis Buffer Locked";
            break;
        }
    }

    DestroySynthesizer(&synthesizer);
}
```

**实时合成流程**：
1. 初始化合成器状态
2. 逐帧添加参数（F0、频谱、非周期性）
3. 触发合成，获取 64 采样块
4. 拼接输出缓冲区

---

## AudioModel 门面类

AudioModel 类协调 WorldModule 和数据转换：

```cpp
AudioModel::AudioModel(double *x, int x_length, int fs, 
    const lessConfigure &configure) {
    // 保存原始音频
    _lessAudioModel.x.resize(x_length);
    _lessAudioModel.x.insert(_lessAudioModel.x.end(), x, x + x_length);
    _lessAudioModel.fs = fs;

    // 执行 WORLD 分析
    WorldModule model(x, x_length, _lessAudioModel.fs, configure);
    worldPara = model.GetModule();
    
    // 转换为 STL 结构
    InitAudioModel();
}
```

### InitAudioModel() 数据转换

```cpp
void AudioModel::InitAudioModel() {
    _lessAudioModel.fft_size = worldPara.fft_size;
    _lessAudioModel.frame_period = worldPara.frame_period;

    // 转换 F0
    _lessAudioModel.f0.resize(worldPara.f0_length);
    _lessAudioModel.f0.insert(_lessAudioModel.f0.end(), 
        worldPara.f0, worldPara.f0 + worldPara.f0_length);

    // 转换时间轴
    _lessAudioModel.time_axis.resize(worldPara.f0_length);
    _lessAudioModel.time_axis.insert(_lessAudioModel.time_axis.end(), 
        worldPara.time_axis, worldPara.time_axis + worldPara.f0_length);

    // 计算频率点数
    _lessAudioModel.w_length = worldPara.fft_size / 2 + 1;

    // 转换频谱包络（二维数组）
    _lessAudioModel.spectrogram.resize(worldPara.f0_length, 
        std::vector<double>(_lessAudioModel.w_length));
    for (int i = 0; i < worldPara.f0_length; ++i) {
        _lessAudioModel.spectrogram[i].assign(
            &(worldPara.spectrogram[i][0]), 
            &(worldPara.spectrogram[i][_lessAudioModel.w_length]));
    }

    // 转换非周期性
    _lessAudioModel.aperiodicity.resize(worldPara.f0_length, 
        std::vector<double>(_lessAudioModel.w_length));
    for (int i = 0; i < worldPara.f0_length; ++i) {
        _lessAudioModel.aperiodicity[i].assign(
            &(worldPara.aperiodicity[i][0]), 
            &(worldPara.aperiodicity[i][_lessAudioModel.w_length]));
    }
}
```

---

## 配置参数对分析的影响

`lessConfigure` 类定义了分析参数：

| 参数 | 默认值 | 作用 |
|------|--------|------|
| `f0_mode` | HARVEST | F0 估计算法选择 |
| `audio_model_frame_period` | ~5.8ms | 帧周期，决定时间分辨率 |
| `f0_speed` | 1 | DIO 降采样比例 |
| `f0_dio_floor` | 40Hz | DIO F0 下限 |
| `f0_harvest_floor` | 40Hz | Harvest F0 下限 |
| `f0_cheap_trick_floor` | 71Hz | CheapTrick F0 下限 |
| `ap_threshold` | 0.10 | D4C 清浊音阈值 |
| `fft_size` | 1024 | FFT 大小（自定义模式） |

**参数调优建议**：
- 高质量分析：使用 HARVEST，frame_period=5ms
- 快速处理：使用 DIO，speed=2 或更高
- 低音分析：降低 f0_floor 到 20-30Hz
- 高频细节：增大 fft_size

---

## 模块交互流程图

```
原始音频 PCM (x, x_length, fs)
         │
         ▼
    ┌────────────────┐
    │ WorldModule    │
    │  - DIO/Harvest │ → F0
    │  - CheapTrick  │ → Spectrogram
    │  - D4C         │ → Aperiodicity
    └────────────────┘
         │
         ▼
    WorldPara (C 指针)
         │
         ▼
    ┌────────────────┐
    │ AudioModel     │
    │ InitAudioModel │
    └────────────────┘
         │
         ▼
  lessAudioModel (STL vector)
         │
    ┌────┴────┐
    │         │
    ▼         ▼
AudioProcess  FileIO (存储)
    │
    ▼
┌──────────────┐
│ Synthesis    │
│ SynthesisWav │
└──────────────┘
    │
    ▼
输出音频 PCM
```

---

## 使用示例

```cpp
#include "AudioModel/AudioModel.h"
#include "ConfigUnit/ConfigUnit.h"

// 读取配置
ConfigUnit config(exec_path);
lessConfigure configure = config.GetConfig();

// 读取 WAV 文件（使用 FileIO 模块）
int fs, x_length;
double *x = WavIO::WavRead("input.wav", &fs, &x_length);

// 创建音频模型
AudioModel audioModel(x, x_length, fs, configure);

// 获取分析结果
lessAudioModel model = audioModel.GetAudioModel();

// 输出 F0 信息
for (int i = 0; i < model.f0.size(); ++i) {
    std::cout << "Frame " << i << ": F0 = " << model.f0[i] << " Hz\n";
}

// 合成回音频
Synthesis synthesis(model, x_length);
double *output = synthesis.GetWavData();
```
