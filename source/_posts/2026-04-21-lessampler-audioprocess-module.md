---
title: 'lessampler: AudioProcess 模块 - 音频变换的艺术'
tags: ['lessampler', 'UTAU']
mathjax: true
date: 2026-04-21 00:00:00
---

AudioProcess 模块是 lessampler 的音频处理核心，负责对 AudioModel 分析出的参数进行变换处理。该模块实现了歌声合成中的两个关键技术：**音高均衡化**和**时间拉伸**。

在歌声合成场景中，用户指定的目标音高可能与原音频不同，同时目标音符的持续时间也与原音频不匹配。AudioProcess 模块通过精确的数学算法，将音频参数映射到目标音高和时间尺度，同时保留原音频的音色特征。

## 模块结构

```
AudioProcess/
├── AudioProcess.h/cpp   # 音频变换处理（音高均衡、时间拉伸）
└── AutoAMP.h/cpp        # 自动振幅调整
```

---

## AudioProcess 类详解

### 类定义

```cpp
class AudioProcess {
public:
    AudioProcess(lessAudioModel audioModel, ShinePara shine);

    lessAudioModel GetTransAudioModel();

private:
    lessAudioModel audioModel{};      // 原始音频模型
    lessAudioModel transAudioModel{}; // 变换后的音频模型
    ShinePara shine;                  // 变换参数

private:
    void InitTransAudioModel();       // 初始化变换模型
    void PicthEqualizing();           // 音高均衡化
    double GetAvgFreq() const;        // 计算平均频率
    void TimeStretch();               // 时间拉伸

private:
    static void interp1(...);         // 一维插值（备用）
    static void histc(...);           // 直方图计数（备用）
};
```

### 构造函数流程

```cpp
AudioProcess::AudioProcess(lessAudioModel audioModel, ShinePara shine) {
    // 1. 初始化变换模型（复制原始模型）
    YALL_DEBUG_ << "Init TransAudioModel default data...";
    InitTransAudioModel();

    // 2. 音高均衡化（调整 F0 到目标音高）
    YALL_DEBUG_ << "Equalizing Pitch...";
    PicthEqualizing();

    // 3. 时间拉伸（调整帧数到目标长度）
    YALL_DEBUG_ << "Time Stretch...";
    TimeStretch();
}
```

---

## 音高均衡化（PitchEqualizing）

### GetAvgFreq() 函数

音高均衡化首先需要计算原音频的平均频率，使用加权平均算法：

```cpp
double AudioProcess::GetAvgFreq() const {
    double freq_avg = 0.0, timePercent, r, p[6], q, base_timePercent = 0;

    for (int i = 0; i < audioModel.f0.size(); ++i) {
        timePercent = audioModel.f0[i];

        // 只处理有效频率范围（55Hz - 1000Hz）
        if (timePercent < 1000.0 && timePercent > 55.0) {
            r = 1.0;
            // 计算 6 个相邻帧的权重
            for (int j = 0; j <= 5; ++j) {
                if (i > j) {
                    q = audioModel.f0[i - j - 1] - timePercent;
                    // 权重公式：当前帧频率 / (当前频率 + 差值平方)
                    p[j] = timePercent / (timePercent + q * q);
                } else {
                    p[j] = 1 / (1 + timePercent);
                }
                r *= p[j];
            }
            // 累加加权值
            freq_avg += timePercent * r;
            base_timePercent += r;
        }
    }

    // 计算加权平均
    if (base_timePercent > 0) 
        freq_avg /= base_timePercent;
    return freq_avg;
}
```

**算法解析**：

这是一个**自适应加权平均**算法，特点如下：

1. **频率范围过滤**：只考虑 55Hz-1000Hz 范围内的 F0 值，排除异常值和静音帧
2. **相邻帧权重**：计算当前帧与前后 6 帧的相似度权重
3. **平滑处理**：权重公式 `p[j] = f0 / (f0 + diff²)` 使得相邻帧差异越大，权重越低
4. **抗噪声能力**：能抵抗瞬时 F0 估计错误的影响

权重公式的数学推导：

当 $q = f_0[i-j-1] - f_0[i]$ 时：
- $q = 0$（完全相同）：$p[j] = 1.0$（最大权重）
- $q$ 很大（差异大）：$p[j] \to 0$（低权重）

$$p[j] = \frac{f_0}{f_0 + q^2}$$

其中 $q = f_{0,i-j-1} - f_{0,i}$

### PicthEqualizing() 函数

```cpp
void AudioProcess::PicthEqualizing() {
    auto freq_avg = GetAvgFreq();
    YALL_DEBUG_ << "The average frequency is " + std::to_string(freq_avg);

    if (freq_avg == 0.0) {
        // 特殊情况：全静音，直接设为目标频率
        for (double &i: audioModel.f0) {
            if (i != 0.0) {
                i = shine.scale_num;
            } else {
                i = 0;
            }
        }
    } else {
        // 正常情况：应用调制公式
        for (double &i: audioModel.f0) {
            if (i != 0.0) {
                // 调制公式
                i = ((i - freq_avg) * shine.modulation / 100.0 + freq_avg) 
                    * (shine.scale_num / freq_avg);
            } else {
                i = 0;
            }
        }
    }
}
```

**调制公式详解**：

$$f_{new} = \left((f_0 - f_{avg}) \cdot \frac{modulation}{100} + f_{avg}\right) \cdot \frac{f_{target}}{f_{avg}}$$

这个公式由两部分组成：

1. **局部调制**：$(f_0 - f_{avg}) \cdot \frac{modulation}{100} + f_{avg}$
   - $modulation$ 是保留原音色特性的程度（0-100）
   - $modulation = 100$：完全保留原 F0 轮廓
   - $modulation = 0$：所有 F0 变为平均值

2. **全局缩放**：$\cdot \frac{f_{target}}{f_{avg}}$
   - 将整体音高偏移到目标音高
   - $f_{target}$ 是目标音符的频率（如 C4 = 261.63Hz）

**公式展开**：

$$f_{new} = f_0 \cdot \frac{modulation}{100} \cdot \frac{f_{target}}{f_{avg}} + f_{avg} \cdot \left(1 - \frac{modulation}{100}\right) \cdot \frac{f_{target}}{f_{avg}}$$

当 $modulation = 100$ 时：

$$f_{new} = f_0 \cdot \frac{f_{target}}{f_{avg}}$$

实现纯音高偏移，保留 F0 轮廓形状。

---

## 时间拉伸（TimeStretch）

时间拉伸是该模块最复杂的部分，负责将原始帧映射到目标时间尺度。

### 概念图示

代码注释中给出了清晰的示意图：

```
//  offset   fixed   pre_cross   blank
//|--------|--------|---------|---------| Original Signal
//         |        |          |
//         |   l1   |    l2     |
//         |--------|------------|        Output Signal
// l1  = fixed / velocity              -> base_length
// l2  = pre_cross / stretch           -> cross_length
// l1 + l2 = required_length           -> required_length
```

这描述了 UTAU 合成的音频结构：
- **offset**：原音频的起始偏移
- **fixed**：固定部分（不拉伸）
- **pre_cross**：预交叉部分（用于拉伸）
- **blank**：空白部分（不使用）

### TimeStretch() 函数核心实现

```cpp
void AudioProcess::TimeStretch() {
    // 分配目标帧内存
    transAudioModel.f0.resize(shine.required_frame);
    transAudioModel.spectrogram.resize(transAudioModel.f0.size(), 
        std::vector<double>(audioModel.w_length));
    transAudioModel.aperiodicity.resize(transAudioModel.f0.size(), 
        std::vector<double>(audioModel.w_length));

    auto avg_freq = GetAvgFreq();

    for (int i = 0; i < transAudioModel.f0.size(); ++i) {
        // 计算输出帧对应的时间位置
        _out_sample_index = audioModel.frame_period * i;

        // 计算对应的输入时间位置（分段映射）
        if (_out_sample_index < shine.base_length) {
            // 固定部分：直接映射，考虑 velocity
            _in_sample_index = shine.offset + _out_sample_index * shine.velocity;
        } else {
            // 拉伸部分：应用 stretch_length 缩放
            _in_sample_index = shine.offset + shine.first_half_fixed_part 
                + (_out_sample_index - shine.base_length) * shine.stretch_length;
        }

        // 计算帧索引和插值位置
        _sample_sp_trans_index = _in_sample_index / audioModel.frame_period;
        _sp_trans_index = static_cast<int>(floor(_sample_sp_trans_index));
        _sample_sp_trans_index -= _sp_trans_index;

        // F0 插值处理
        auto temp_f0 = audioModel.f0[_sp_trans_index];
        if (_sp_trans_index < audioModel.f0.size() - 1) {
            auto temp_f0_next = audioModel.f0[_sp_trans_index + 1];
            if (temp_f0 != 0 || temp_f0_next != 0) {
                if (temp_f0 == 0) temp_f0 = avg_freq;
                if (temp_f0_next == 0) temp_f0_next = avg_freq;
                // 线性插值
                temp_f0 = temp_f0 * (1.0 - _sample_sp_trans_index) 
                    + temp_f0_next * _sample_sp_trans_index;
            }
        }

        // 应用 Pitch Bend
        _sample_ap_trans_index = _out_sample_index * 0.001 * audioModel.fs / shine.pitch_step;
        _ap_trans_index = static_cast<int>(floor(_sample_ap_trans_index));
        _sample_ap_trans_index -= _ap_trans_index;

        // Pitch Bend 插值
        auto pitch_base = shine.scale_num * pow(2, 
            (shine.pitch_bend[_ap_trans_index] * (1.0 - _sample_ap_trans_index) +
             shine.pitch_bend[_ap_trans_index + 1] * _sample_ap_trans_index) / 1200.0);

        // 设置变换后的 F0
        transAudioModel.f0[i] = pitch_base;
        transAudioModel.f0[i] *= pow(temp_f0 / avg_freq, shine.modulation * 0.01);

        // 频谱包络插值
        for (int j = 0; j < audioModel.w_length; ++j) {
            if (_sp_trans_index < audioModel.f0.size() - 1) {
                transAudioModel.spectrogram[i][j] = 
                    audioModel.spectrogram[_sp_trans_index][j] * (1.0 - _sample_sp_trans_index) +
                    audioModel.spectrogram[_sp_trans_index + 1][j] * _sample_sp_trans_index;
            } else {
                transAudioModel.spectrogram[i][j] = 
                    audioModel.spectrogram[audioModel.f0.size() - 1][j];
            }
        }

        // 非周期性（选择最近的帧）
        _ap_trans_index = _sp_trans_index;
        if (_sample_sp_trans_index > 0.5) ++_ap_trans_index;

        for (int j = 0; j < audioModel.w_length; ++j) {
            if (_ap_trans_index < audioModel.f0.size()) {
                transAudioModel.aperiodicity[i][j] = audioModel.aperiodicity[_ap_trans_index][j];
            } else {
                transAudioModel.aperiodicity[i][j] = audioModel.aperiodicity[audioModel.f0.size() - 1][j];
            }
        }
    }
}
```

### 时间映射详解

**分段映射公式**：

$$t_{in} = \begin{cases} offset + t_{out} \cdot velocity & \text{if } t_{out} < base\_length \\ offset + fixed + (t_{out} - base\_length) \cdot stretch & \text{otherwise} \end{cases}$$

其中：
- $velocity = 2^{time\_percent/100 - 1}$：影响固定部分的时长
- $stretch = \frac{pre\_cross\_length}{cross\_length}$：拉伸比例

**参数关系**：

$$base\_length = \frac{fixed}{velocity}$$

$$cross\_length = required\_length - base\_length$$

$$stretch = \frac{pre\_cross}{cross\_length}$$

### Pitch Bend 应用

Pitch Bend 是 UTAU 的弯音控制，以音分（cents）为单位，10 cents = 1 半音。

```cpp
// 计算弯音位置
_ap_trans_index = out_time * fs / pitch_step;

// Pitch Bend 插值得到弯音值
bend_value = pitch_bend[index] * (1 - frac) + pitch_bend[index+1] * frac;

// 应用弯音（cents 转频率）
pitch_base = scale_num * pow(2, bend_value / 1200.0);
```

**公式解释**：
- $pitch\_step = \frac{60.0}{96.0 \cdot tempo} \cdot fs$：弯音采样步长
- $\frac{bend\_value}{1200.0}$：cents 转半音（1200 cents = 12 半音 = 1 倍频）
- $2^{(\cdot)}$：半音转频率比例

**Pitch Bend 公式**：

$$f_{bend} = f_{base} \cdot 2^{\frac{bend\_value}{1200}}$$

其中 $bend\_value$ 是线性插值后的弯音值：

$$bend\_value = bend_i \cdot (1 - \alpha) + bend_{i+1} \cdot \alpha$$

$\alpha$ 为插值系数。

---

## AutoAMP 类详解

AutoAMP 负责音频输出的振幅自动调整。

### 类定义

```cpp
class AutoAMP {
public:
    AutoAMP(ShinePara shine, double *x);       // 使用 Shine 参数
    AutoAMP(double *x, int x_length, double amp_val);  // 仅 WAV
    double *GetAMP();

private:
    ShinePara shine;
    int x_length = 0;
    double *x = nullptr;        // 输入音频
    double *x_out = nullptr;    // 输出音频

    const double default_sample_value = 0.86;
    const double MaxValue = 1.0;
    const double MinValue = -1.0;

    double sample_value = 0.0;
    double MaxAMP = 0.0;

private:
    void GetMaxAMP();                      // 计算最大振幅
    void SetDefaultValue();                // 设置默认值
    void DiminishedConsonantFricative();   // 辅音衰减
    void LimitMaximumAmplitude();          // 限幅
};
```

### 构造函数流程

```cpp
AutoAMP::AutoAMP(ShinePara shine, double *x) {
    this->x_length = shine.output_samples;
    this->x = x;
    this->x_out = new double[x_length];

    // 1. 计算最大振幅
    GetMaxAMP();

    // 2. 设置默认值
    SetDefaultValue();

    // 3. 辅音衰减处理
    DiminishedConsonantFricative();

    // 4. 限幅处理
    LimitMaximumAmplitude();
}
```

### GetMaxAMP() 函数

```cpp
void AutoAMP::GetMaxAMP() {
    for (int i = 0; i < x_length - 1; ++i) {
        if (!std::isnan(x[i])) {
            if (MaxAMP < std::abs(x[i])) {
                MaxAMP = std::abs(x[i]);
            }
        }
    }
    if (MaxAMP == 0.0) {
        YALL_WARN_ << "Max AMP is Zero.";
    }
}
```

遍历所有采样点，找出绝对值最大的振幅，用于后续归一化。

### DiminishedConsonantFricative() 函数

```cpp
void AutoAMP::DiminishedConsonantFricative() {
    for (int i = 0; i < x_length; ++i) {
        // 处理 NaN 值（静音）
        if (std::isnan(x[i])) {
            x_out[i] = 0.0;
        } else {
            // 归一化并应用音量
            x_out[i] = x[i] * 0.5 * shine.volumes / MaxAMP;
        }
    }
}
```

**算法要点**：
- `* 0.5`：衰减系数，防止输出过大
- `shine.volumes`：用户指定的音量百分比（已乘 0.01）
- `/ MaxAMP`：归一化，使最大振幅映射到目标值

### LimitMaximumAmplitude() 函数

```cpp
void AutoAMP::LimitMaximumAmplitude() {
    for (int i = 0; i < x_length; ++i) {
        if (x_out[i] > MaxValue) {
            x_out[i] = MaxValue;  // 限制到 1.0
        } else if (x_out[i] < MinValue) {
            x_out[i] = MinValue;  // 限制到 -1.0
        }
    }
}
```

硬限幅，防止音频超过 [-1.0, 1.0] 范围，避免播放时的削波失真。

---

## 辅助函数

### interp1() 一维插值

```cpp
void AudioProcess::interp1(const double *x, const double *y, int x_length,
    const double *xi, int xi_length, double *yi) {
    // 计算步长 h
    auto *h = new double[x_length - 1];
    for (int i = 0; i < x_length - 1; ++i) {
        h[i] = x[i + 1] - x[i];
    }

    // 找到每个 xi 对应的区间
    int *k = new int[xi_length];
    histc(x, x_length, xi, xi_length, k);

    // 线性插值
    for (int i = 0; i < xi_length; ++i) {
        double s = (xi[i] - x[k[i] - 1]) / h[k[i] - 1];
        yi[i] = y[k[i] - 1] + s * (y[k[i]] - y[k[i] - 1]);
    }

    delete[] k;
    delete[] h;
}
```

### histc() 直方图计数

```cpp
void AudioProcess::histc(const double *x, int x_length, 
    const double *edges, int edges_length, int *index) {
    int count = 1;

    int i = 0;
    for (; i < edges_length; ++i) {
        index[i] = 1;
        if (edges[i] >= x[0]) break;
    }

    for (; i < edges_length; ++i) {
        if (edges[i] < x[count]) {
            index[i] = count;
        } else {
            index[i--] = count++;
        }
        if (count == x_length) break;
    }

    count--;
    for (i++; i < edges_length; ++i) 
        index[i] = count;
}
```

这两个函数是 MATLAB `interp1` 和 `histc` 的 C++ 实现，用于高级插值场景，当前主要逻辑中未使用。

---

## 数据流图

```
lessAudioModel (原始)
     │
     ▼
┌─────────────────┐
│ GetAvgFreq      │ 计算加权平均频率
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ PicthEqualizing │ F0 调制 → 目标音高
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ TimeStretch     │ 帧映射 + Pitch Bend
│  - 分段映射     │
│  - F0 插值      │
│  - SP 插值      │
│  - AP 选择      │
└─────────────────┘
     │
     ▼
lessAudioModel (变换后)
     │
     ▼
┌─────────────────┐
│ Synthesis       │ 合成波形
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ AutoAMP         │ 振幅调整
│  - GetMaxAMP    │
│  - Diminish     │
│  - Limit        │
└─────────────────┘
     │
     ▼
输出 PCM
```

---

## 使用示例

```cpp
#include "AudioProcess/AudioProcess.h"
#include "AudioProcess/AutoAMP.h"

// 假设已有原始音频模型和变换参数
lessAudioModel originalModel = audioModel.GetAudioModel();
ShinePara shineParams = shine.GetShine();

// 执行音频变换
AudioProcess processor(originalModel, shineParams);
lessAudioModel transformedModel = processor.GetTransAudioModel();

// 合成波形
Synthesis synth(transformedModel, shineParams.output_samples);
double *rawOutput = synth.GetWavData();

// 振幅调整
AutoAMP amp(shineParams, rawOutput);
double *finalOutput = amp.GetAMP();

// 写入 WAV
WavIO::WriteWav(shineParams.output_file_name, finalOutput, 
    shineParams.output_samples, transformedModel.fs);
```

---

## 数学公式总结

| 操作 | 公式 |
|------|------|
| 加权平均权重 | $$p[j] = \frac{f0}{f0 + q^2}$$, 其中 $q = f0_{i-j-1} - f0_i$ |
| F0 调制 | $$f_{new} = \left((f_0 - f_{avg}) \cdot \frac{mod}{100} + f_{avg}\right) \cdot \frac{f_{target}}{f_{avg}}$$ |
| 时间映射（固定） | $$t_{in} = offset + t_{out} \cdot velocity$$ |
| 时间映射（拉伸） | $$t_{in} = offset + fixed + (t_{out} - base) \cdot stretch$$ |
| Pitch Bend | $$pitch = base \cdot 2^{\frac{bend\_{cents}}{1200}}$$ |
| 振幅归一化 | $$x_{out} = x \cdot 0.5 \cdot \frac{volume}{max\_amp}$$ |
