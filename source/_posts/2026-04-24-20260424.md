---
title: 'lessampler: FileIO 模块 - 音频模型的存储与加载'
tags: ['lessampler', 'UTAU']
date: 2026-04-24 00:00:00
---

FileIO 模块负责 lessampler 的所有文件读写操作，包括音频模型文件的二进制存储、WAV 文件读写、JSON 导出以及批量模型生成。该模块是数据持久化的核心，确保音频分析结果能够高效存储并在后续合成时快速加载。

音频模型文件（`.lessaudio`）是 lessampler 的核心数据格式，存储了 WORLD 分析的全部结果。该格式经过优化，使用紧凑的二进制结构，支持版本校验以防止配置不一致导致的合成错误。

## 模块结构

```
FileIO/
├── AudioModelIO.h/cpp    # 音频模型文件读写
├── GenerateAudioModel.h/cpp # 批量模型生成
├── WavIO.h/cpp           # WAV 文件读写
├── JSONFileIO.h/cpp      # JSON 导出（调试用）
└── ZlibStream.h/cpp      # LZ4 压缩（预留）
```

---

## AudioModelIO 类详解

AudioModelIO 是音频模型文件操作的核心类，负责 `.lessaudio` 文件的读写和版本验证。

### 类定义

```cpp
class AudioModelIO {
public:
    AudioModelIO(std::filesystem::path Path, lessAudioModel audioModel, lessConfigure configure);
    explicit AudioModelIO(std::filesystem::path Path);
    ~AudioModelIO();

    void SetFilePath(const std::filesystem::path &Path);
    void SetAudioModel(lessAudioModel audioModel);
    std::filesystem::path GetFilePath();
    lessAudioModel GetAudioModel();

    bool CheckAudioModel(lessConfigure configure);  // 检查模型存在性和版本
    void SaveAudioModel();                          // 保存模型
    lessAudioModel ReadAudioModel(lessConfigure configure);  // 读取模型

private:
    lessAudioModel _audioModel{};
    lessConfigure _configure{};
    std::filesystem::path root_file_path{};
    std::filesystem::path in_file_path{};
    std::filesystem::path audio_model_file_path{};  // .lessaudio 路径

protected:
    const std::string audio_model_file_ext = "lessaudio";  // 文件扩展名
    const char lessaudio_header[6] = {'s', 'h', 'i', 'n', 'e', '\0'};  // 文件头
    const char lessaudio_ending[5] = {'5', '4', '0', '2', '\0'};       // 文件尾

private:
    std::ofstream WriteAudioContent();   // 写入二进制内容
    void ReadAudioContent();             // 读取二进制内容
    void GenerateFilePath();             // 生成模型文件路径
    bool CheckAudioModelVersion();       // 验证版本校验码
    static bool CheckAudioModelFile(const std::filesystem::path &path);
};
```

### .lessaudio 文件格式设计

文件结构如下：

```
┌─────────────────────────────┐
│ Header: "shine\0"           │ 6 bytes - 文件标识
├─────────────────────────────┤
│ Version Size                │ sizeof(std::streamsize)
│ Version String              │ 40 bytes - SHA-1 校验码
├─────────────────────────────┤
│ x_length                    │ sizeof(int)
│ fs                          │ sizeof(int)
│ frame_period                │ sizeof(double)
│ w_length                    │ sizeof(int)
│ fft_size                    │ sizeof(int)
├─────────────────────────────┤
│ F0 Size                     │ sizeof(std::streamsize)
│ F0 Array                    │ f0_size × sizeof(double)
├─────────────────────────────┤
│ SP Outer Size               │ sizeof(std::streamsize)
│ For each frame:             │
│   SP Inner Size             │ sizeof(std::streamsize)
│   SP Frame Data             │ inner_size × sizeof(double)
├─────────────────────────────┤
│ AP Outer Size               │ sizeof(std::streamsize)
│ For each frame:             │
│   AP Inner Size             │ sizeof(std::streamsize)
│   AP Frame Data             │ inner_size × sizeof(double)
├─────────────────────────────┤
│ Ending: "5402\0"            │ 5 bytes - 文件结束标识
└─────────────────────────────┘
```

### WriteAudioContent() 写入实现

```cpp
std::ofstream AudioModelIO::WriteAudioContent() {
    std::ofstream audio_out_model(audio_model_file_path, std::ios::out | std::ios::binary);

    // 1. 写入文件头
    audio_out_model.write(lessaudio_header, sizeof(char) * 6);

    // 2. 写入版本校验码
    std::streamsize ver_string_size = _configure.get_version().size();
    auto ver_string = _configure.get_version();
    audio_out_model.write(reinterpret_cast<const char *>(&ver_string_size), sizeof(std::streamsize));
    audio_out_model.write(ver_string.c_str(), ver_string_size * sizeof(char));

    // 3. 写入基本信息
    int x_length = _audioModel.x.size();
    audio_out_model.write(reinterpret_cast<const char *>(&x_length), sizeof(int));
    audio_out_model.write(reinterpret_cast<const char *>(&_audioModel.fs), sizeof(int));
    audio_out_model.write(reinterpret_cast<const char *>(&_audioModel.frame_period), sizeof(double));
    audio_out_model.write(reinterpret_cast<const char *>(&_audioModel.w_length), sizeof(int));
    audio_out_model.write(reinterpret_cast<const char *>(&_audioModel.fft_size), sizeof(int));

    // 4. 写入 F0 数据
    std::streamsize f0_size = _audioModel.f0.size();
    audio_out_model.write(reinterpret_cast<const char *>(&f0_size), sizeof(std::streamsize));
    audio_out_model.write(reinterpret_cast<const char *>(&_audioModel.f0[0]), f0_size * sizeof(double));

    // 5. 写入频谱包络数据（二维数组）
    std::streamsize sp_size = _audioModel.spectrogram.size();
    audio_out_model.write(reinterpret_cast<const char *>(&sp_size), sizeof(std::streamsize));
    for (auto &item: _audioModel.spectrogram) {
        std::streamsize size = item.size();
        audio_out_model.write(reinterpret_cast<const char *>(&size), sizeof(std::streamsize));
        audio_out_model.write(reinterpret_cast<const char *>(&item[0]), item.size() * sizeof(double));
    }

    // 6. 写入非周期性数据（二维数组）
    std::streamsize ap_size = _audioModel.aperiodicity.size();
    audio_out_model.write(reinterpret_cast<const char *>(&ap_size), sizeof(std::streamsize));
    for (auto &item: _audioModel.aperiodicity) {
        auto size = item.size();
        audio_out_model.write(reinterpret_cast<const char *>(&size), sizeof(std::streamsize));
        audio_out_model.write(reinterpret_cast<const char *>(&item[0]), item.size() * sizeof(double));
    }

    // 7. 写入文件尾
    audio_out_model.write(lessaudio_ending, sizeof(char) * 5);

    return audio_out_model;
}
```

**写入要点**：
- 使用二进制模式 (`std::ios::binary`) 避免平台换行符差异
- 二维数组按行存储，每行先写入长度再写入数据
- 使用 `reinterpret_cast` 将数值转为字节序列

### ReadAudioContent() 读取实现

```cpp
void AudioModelIO::ReadAudioContent() {
    std::ifstream audio_in_model(audio_model_file_path, std::ios::in | std::ios::binary);

    // 1. 检查文件头
    auto header = new char[6];
    audio_in_model.read(header, sizeof(char) * 6);
    if (std::string(lessaudio_header) != std::string(header)) {
        throw header_check_error(header, lessaudio_header);
    }

    // 2. 检查版本校验码
    std::streamsize ver_string_size;
    audio_in_model.read(reinterpret_cast<char *>(&ver_string_size), sizeof(std::streamsize));
    std::vector<char> _temp(ver_string_size);
    audio_in_model.read(reinterpret_cast<char *>(&_temp[0]), std::streamsize(ver_string_size * sizeof(char)));
    std::string ver_string(_temp.begin(), _temp.end());

    if (ver_string != _configure.get_version()) {
        throw file_version_error("Please Regenerate Audio Model");
    }

    // 3. 读取基本信息
    int x_length;
    audio_in_model.read(reinterpret_cast<char *>(&x_length), sizeof(int));
    audio_in_model.read(reinterpret_cast<char *>(&_audioModel.fs), sizeof(int));
    audio_in_model.read(reinterpret_cast<char *>(&_audioModel.frame_period), sizeof(double));
    audio_in_model.read(reinterpret_cast<char *>(&_audioModel.w_length), sizeof(int));
    audio_in_model.read(reinterpret_cast<char *>(&_audioModel.fft_size), sizeof(int));

    _audioModel.x.resize(x_length);

    // 4. 读取 F0 数据
    std::streamsize f0_length_size = 0;
    audio_in_model.read(reinterpret_cast<char *>(&f0_length_size), sizeof(std::streamsize));
    _audioModel.f0.resize(f0_length_size);
    audio_in_model.read(reinterpret_cast<char *>(&_audioModel.f0[0]), std::streamsize(f0_length_size * sizeof(double)));

    // 5. 读取频谱包络数据
    std::streamsize sp_length_size = 0;
    audio_in_model.read(reinterpret_cast<char *>(&sp_length_size), sizeof(std::streamsize));
    for (std::streamsize n = 0; n < sp_length_size; ++n) {
        std::streamsize sp_inner_length_size = 0;
        audio_in_model.read(reinterpret_cast<char *>(&sp_inner_length_size), sizeof(std::streamsize));
        _audioModel.spectrogram.resize(sp_length_size, std::vector<double>(sp_inner_length_size));
        audio_in_model.read(reinterpret_cast<char *>(&_audioModel.spectrogram[n][0]), std::streamsize(sp_inner_length_size * sizeof(double)));
    }

    // 6. 读取非周期性数据
    std::streamsize ap_length_size = 0;
    audio_in_model.read(reinterpret_cast<char *>(&ap_length_size), sizeof(std::streamsize));
    for (std::streamsize n = 0; n < ap_length_size; ++n) {
        std::streamsize ap_inner_length_size = 0;
        audio_in_model.read(reinterpret_cast<char *>(&ap_inner_length_size), sizeof(std::streamsize));
        _audioModel.aperiodicity.resize(ap_length_size, std::vector<double>(ap_inner_length_size));
        audio_in_model.read(reinterpret_cast<char *>(&_audioModel.aperiodicity[n][0]), std::streamsize(ap_inner_length_size * sizeof(double)));
    }

    // 7. 检查文件尾
    auto end = new char[6];
    audio_in_model.read(end, sizeof(char) * 6);
    if (std::string(lessaudio_ending) != std::string(end)) {
        throw header_check_error(end, lessaudio_ending);
    }
}
```

### CheckAudioModel() 模型检查

```cpp
bool AudioModelIO::CheckAudioModel(lessConfigure configure) {
    _configure = std::move(configure);

    if (!CheckAudioModelFile(audio_model_file_path)) {
        YALL_DEBUG_ << "Audio Model NOT Exist.";
        return false;
    } else {
        if (!CheckAudioModelVersion()) {
            YALL_WARN_ << "Audio Model Exist, But Version Check Fail. Regenerate...";
            return false;
        }
        YALL_DEBUG_ << "Audio Model Exist.";
        return true;
    }
}
```

### CheckAudioModelVersion() 版本验证

```cpp
bool AudioModelIO::CheckAudioModelVersion() {
    std::ifstream audio_in_model(audio_model_file_path, std::ios::in | std::ios::binary);

    // 检查文件头
    auto header = new char[6];
    audio_in_model.read(header, sizeof(char) * 6);
    if (std::string(lessaudio_header) != std::string(header)) {
        return false;
    }

    // 检查版本校验码
    std::streamsize ver_string_size;
    audio_in_model.read(reinterpret_cast<char *>(&ver_string_size), sizeof(std::streamsize));
    std::vector<char> _temp(ver_string_size);
    audio_in_model.read(reinterpret_cast<char *>(&_temp[0]), std::streamsize(ver_string_size * sizeof(char)));
    std::string ver_string(_temp.begin(), _temp.end());

    if (ver_string != _configure.get_version()) {
        return false;
    }
    return true;
}
```

---

## GenerateAudioModel 类详解

GenerateAudioModel 负责批量生成音频模型，使用多线程并行处理提高效率。

### 类定义

```cpp
class GenerateAudioModel {
public:
    GenerateAudioModel(std::filesystem::path path, lessConfigure configure);
    GenerateAudioModel(char *path, lessConfigure configure);  // 单文件模式

    void PrintWavFiles();

private:
    std::filesystem::path target_voice_path;
    std::vector<std::filesystem::path> wav_files;
    lessConfigure configure;

private:
    void GetWavFileLists();           // 获取 WAV 文件列表
    void GenerateModelFromFile();     // 多线程生成
    void WavFileModel(const std::filesystem::path &wav_path);  // 单文件处理

    // 并行 for_each 实现
    template<class I, class F>
    void for_each(size_t thread_count, I begin, I end, F f);

    template<class I, class F>
    void for_each(I begin, I end, F f);
};
```

### GetWavFileLists() 文件扫描

```cpp
void GenerateAudioModel::GetWavFileLists() {
    YALL_INFO_ << "Working on folder: " + target_voice_path.string();
    for (const auto &entry: std::filesystem::directory_iterator(target_voice_path)) {
        if (entry.path().extension().string() == ".wav") {
            wav_files.push_back(entry.path());
        }
    }
}
```

使用 C++17 的 `std::filesystem` 遍历目录，筛选 `.wav` 文件。

### WavFileModel() 单文件处理

```cpp
void GenerateAudioModel::WavFileModel(const std::filesystem::path &wav_path) {
    // 读取 WAV 文件
    auto x_length = WavIO::GetAudioLength(wav_path.string().c_str());
    auto x = new double[x_length];
    auto fs = WavIO::WavRead(wav_path.string().c_str(), x);

    // 应用 AutoAMP（可选）
    if (configure.model_amp != 0.0) {
        YALL_DEBUG_ << "Apply AMP Before Modeling";
        AutoAMP amp(x, x_length, configure.model_amp);
        x = amp.GetAMP();
    }

    // 执行 WORLD 分析
    AudioModel audioModel(x, x_length, fs, configure);
    auto model = audioModel.GetAudioModel();

    // 保存音频模型
    AudioModelIO audioModelIO(wav_path.string(), model, configure);
    audioModelIO.SaveAudioModel();
}
```

### for_each() 并行处理实现

```cpp
template<class I, class F>
void GenerateAudioModel::for_each(size_t thread_count, I begin, I end, F f) {
    I it = begin;

    // 边界检查：空或单元素
    if (it == end)
        return;
    if (++it == end) {
        f(*begin);
        return;
    }

    // 硬件并发数为 0 时使用 1 线程
    if (thread_count == 0) {
        thread_count = 1;
    }

    std::vector<std::thread> threads;
    threads.reserve(thread_count - 1);

    // 工作函数：从迭代器取元素并处理
    auto worker_ = [&begin, &end, &f] {
        while (true) {
            I it;
            it = begin;
            if (it == end)
                break;
            ++begin;
            f(*it);
        }
    };

    // 创建工作线程
    for (unsigned i = 0; i < thread_count - 1; ++i, ++it) {
        if (it == end)
            break;
        threads.emplace_back(std::thread(worker_));
    }

    // 主线程也参与工作
    worker_();

    // 等待所有线程完成
    for (auto &th: threads) {
        th.join();
    }
}

// 默认使用硬件并发数的一半
template<class I, class F>
void GenerateAudioModel::for_each(I begin, I end, F f) {
    for_each(std::lround(std::thread::hardware_concurrency() / 2), begin, end, f);
}
```

**并行处理要点**：
- 使用 `std::thread::hardware_concurrency()` 获取可用线程数
- 默认使用一半线程数，避免过度占用 CPU
- 主线程也参与处理，提高效率
- 使用 `std::join()` 确保所有线程完成

---

## WavIO 类详解

WavIO 使用 libsndfile 库处理 WAV 文件读写。

### 类定义

```cpp
class WavIO {
public:
    WavIO() = default;

    static int GetAudioLength(const char *filename);  // 获取采样数
    static int WavRead(const char *FilePath, double *output);  // 读取 WAV
    static void WriteWav(const std::filesystem::path &path, double *x, long long x_length, int fs);  // 写入 WAV
};
```

### WavRead() WAV 读取

```cpp
extern "C" {
#include <sndfile.h>
}

int WavIO::WavRead(const char *FilePath, double *output) {
    SNDFILE *sf;
    SF_INFO info;
    info.format = 0;  // 读取时自动检测格式

    sf = sf_open(FilePath, SFM_READ, &info);
    if (sf == nullptr) {
        YALL_ERROR_ << "Failed to open the file.";
        exit(-1);
    }

    sf_count_t f = info.frames;
    int c = info.channels;
    auto num_items = f * c;
    auto buf = new double[num_items];

    // 读取所有采样
    auto num = sf_read_double(sf, buf, num_items);
    sf_close(sf);

    // 复制数据到输出缓冲区
    for (int i = 0; i < num; i += c) {
        for (int j = 0; j < c; ++j) {
            if ((i + j) < f) {
                output[i + j] = buf[i + j];
            }
        }
    }

    // 立体声转单声道处理
    if (c > 1) {
        YALL_WARN_ << "Can't read stereo file for lessampler. handle it as mono.";
        auto temp_ = new double[num];
        for (int i = 0; i < num; i++) {
            temp_[i] = 0;
            for (int j = 0; j < info.channels; j++)
                temp_[i] += output[i * info.channels + j];
            temp_[i] /= info.channels;  // 平均声道
        }

        for (int i = 0; i < num; ++i) {
            output[i] = temp_[i];
        }
    }

    delete[] buf;
    return info.samplerate;  // 返回采样率
}
```

**立体声处理**：
- lessampler 只支持单声道
- 如果输入是立体声，将两声道平均合并为单声道
- 公式：`mono = (left + right) / 2`

### WriteWav() WAV 写入

```cpp
void WavIO::WriteWav(const std::filesystem::path &path, double *x, long long x_length, int fs) {
    SNDFILE *sf;
    SF_INFO info;

    // 设置输出格式
    info.channels = 1;  // 单声道
    info.samplerate = fs;
    info.frames = x_length;
    info.format = SF_FORMAT_WAV | SF_FORMAT_PCM_16;  // 16-bit PCM WAV

    sf = sf_open(path.string().c_str(), SFM_WRITE, &info);
    if (sf == nullptr) {
        YALL_ERROR_ << "Failed to open the file.";
        exit(-1);
    }

    sf_write_double(sf, x, x_length);
    sf_close(sf);
}
```

**输出格式**：
- WAV 格式（SF_FORMAT_WAV）
- 16-bit PCM（SF_FORMAT_PCM_16）
- 单声道

---

## JSONFileIO 类详解

JSONFileIO 用于导出 JSON 格式的音频模型，主要用于调试和分析。

### JSON 输出格式

```json
{
  "NODE": "LESS_F0_DOUBLE",
  "F0LEN": 1024,
  "F0": [440.0, 441.5, 439.8, ...],
  "FFTSIZE": 1024,
  "WLEN": 513,
  "SEQ": [
    [0.1, 0.2, 0.3, ...],  // 第一帧频谱包络
    [0.1, 0.2, 0.3, ...],  // 第二帧频谱包络
    ...
  ],
  "AP": [
    [0.05, 0.06, 0.07, ...],  // 第一帧非周期性
    [0.05, 0.06, 0.07, ...],  // 第二帧非周期性
    ...
  ]
}
```

### SaveJsonModel() 实现

```cpp
void JSONFileIO::SaveJsonModel() {
    rapidjson::StringBuffer s;
    rapidjson::PrettyWriter<rapidjson::StringBuffer> writer(s);

    writer.StartObject();

    // 节点标识
    writer.Key("NODE");
    writer.String("LESS_F0_DOUBLE");

    // F0 长度
    writer.Key("F0LEN");
    writer.Uint(_audioModel.f0.size());

    // F0 数据
    writer.Key("F0");
    writer.StartArray();
    for (double i : _audioModel.f0) {
        writer.Double(i);
    }
    writer.EndArray();

    // FFT 大小
    writer.Key("FFTSIZE");
    writer.Int(_audioModel.fft_size);

    // W 长度
    writer.Key("WLEN");
    writer.Int(_audioModel.w_length);

    // 频谱包络数据
    writer.Key("SEQ");
    writer.StartArray();
    for (int i = 0; i < _audioModel.f0.size(); ++i) {
        writer.StartArray();
        for (int j = 0; j < _audioModel.w_length; ++j) {
            writer.Double(_audioModel.spectrogram[i][j]);
        }
        writer.EndArray();
    }
    writer.EndArray();

    // 非周期性数据
    writer.Key("AP");
    writer.StartArray();
    for (int i = 0; i < _audioModel.f0.size(); ++i) {
        writer.StartArray();
        for (int j = 0; j < _audioModel.w_length; ++j) {
            writer.Double(_audioModel.aperiodicity[i][j]);
        }
        writer.EndArray();
    }
    writer.EndArray();

    writer.EndObject();

    // 写入文件
    std::ofstream fout(Path, std::ios::out);
    if (!fout)
        throw file_open_error(Path);
    fout << s.GetString();
    fout.close();
}
```

---

## 数据流图

```
WAV 文件输入
     │
     ▼
┌────────────┐
│   WavIO    │
│  WavRead   │
└────────────┘
     │
     ▼
PCM 数据 (x, x_length, fs)
     │
     ▼
┌─────────────────────┐
│ GenerateAudioModel  │
│  - GetWavFileLists  │ 扫描目录
│  - for_each         │ 多线程并行
│  - WavFileModel     │ 单文件处理
└─────────────────────┘
     │
     ├──────────────────┐
     │                  │
     ▼                  ▼
┌────────────┐    ┌────────────┐
│ AutoAMP    │    │ AudioModel │
│ (可选)      │    │ WORLD 分析  │
└────────────┘    └────────────┘
     │                  │
     └──────────────────┤
                        │
                        ▼
               lessAudioModel
                        │
                        ▼
               ┌──────────────────┐
               │ AudioModelIO     │
               │ SaveAudioModel   │
               └──────────────────┘
                        │
                        ▼
               .lessaudio 文件

加载流程：
.lessaudio 文件
     │
     ▼
┌────────────┐
│ AudioModelIO │
│ CheckAudioModel │ 验证版本
│ ReadAudioModel │ 读取数据
└────────────┘
     │
     ▼
lessAudioModel
     │
     ▼
AudioProcess → Synthesis → AutoAMP
     │
     ▼
┌────────────┐
│   WavIO    │
│  WriteWav  │
└────────────┘
     │
     ▼
输出 WAV 文件
```

---

## 使用示例

### 批量生成音频模型

```cpp
#include "FileIO/GenerateAudioModel.h"
#include "ConfigUnit/ConfigUnit.h"

// 加载配置
ConfigUnit configUnit(exec_path);
lessConfigure configure = configUnit.GetConfig();

// 批量生成音源库模型
std::filesystem::path voice_path = "path/to/voicebank";
GenerateAudioModel generator(voice_path, configure);

// 自动扫描所有 WAV 文件并生成 .lessaudio
```

### 单文件模型生成

```cpp
// 单个 WAV 文件生成模型
GenerateAudioModel generator("input.wav", configure);
```

### 读取和使用音频模型

```cpp
#include "FileIO/AudioModelIO.h"

// 创建 IO 对象
AudioModelIO audioModelIO("input.wav");

// 检查模型是否存在且版本匹配
if (!audioModelIO.CheckAudioModel(configure)) {
    // 需要重新生成
    GenerateAudioModel generator("input.wav", configure);
}

// 读取模型
lessAudioModel model = audioModelIO.ReadAudioModel(configure);

// 使用模型进行合成...
```

### 导出 JSON（调试）

```cpp
#include "FileIO/JSONFileIO.h"

// 导出 JSON 格式用于分析
JSONFileIO jsonExporter(model, "model.json");
```

---

## 文件大小估算

对于典型的音频文件：

| 参数 | 值 |
|------|-----|
| 采样率 | 44100 Hz |
| 时长 | 1 秒 |
| 帧周期 | 5.8 ms |
| 帧数 | ~172 帧 |
| FFT 大小 | 1024 |
| W 长度 | 513 |

**文件大小估算**：

$$\begin{aligned}
&\text{Header} + \text{Version} &\approx& 50 \text{ bytes} \\
&\text{基本信息} &\approx& 5 \times sizeof(int/double) \approx 28 \text{ bytes} \\
&\text{F0} &=& 172 \times sizeof(double) \approx 1376 \text{ bytes} \\
&\text{SP} &=& 172 \times 513 \times sizeof(double) \approx 710 \text{ KB} \\
&\text{AP} &=& 172 \times 513 \times sizeof(double) \approx 710 \text{ KB} \\
&\text{Ending} &\approx& 5 \text{ bytes} \\
\hline
&\text{总计} &\approx& 1.4 \text{ MB/秒}
\end{aligned}$$

对于典型音源库（100 个音素，每音素 0.5 秒），模型文件约 70 MB。

