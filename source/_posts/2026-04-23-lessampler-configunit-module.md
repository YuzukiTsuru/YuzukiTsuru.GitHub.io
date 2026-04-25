---
title: 'lessampler: ConfigUnit 模块 - 配置系统的设计'
tags: ['lessampler', 'UTAU']
mathjax: true
date: 2026-04-23 00:00:00
---

ConfigUnit 模块负责 lessampler 的配置管理，包括全局配置、音源库配置和版本校验。该模块采用 INI 文件格式存储配置，使用 inicpp 库进行解析，并通过 SHA-1 校验和确保配置参数的一致性。

配置系统是歌声合成器的重要组成部分，因为不同的配置参数会产生不同的音频分析结果。如果用户更改配置后使用了旧配置生成的音频模型，会导致合成结果不准确。因此，ConfigUnit 模块设计了完善的版本校验机制来解决这个问题。

## 模块结构

```
ConfigUnit/
├── lessConfigure.h/cpp    # 配置参数结构体
├── ConfigUnit.h/cpp       # 全局配置加载
├── ConfigVoiceBank.h/cpp  # 音源库配置
├── ConfigFileIO.h         # 文件读写工具
└── SHA1.h/cpp             # SHA-1 校验实现
```

---

## lessConfigure 类详解

lessConfigure 是配置参数的核心数据结构，定义了所有可配置的分析参数。

### 类定义

```cpp
class lessConfigure {
public:
    std::string get_version();  // 获取校验版本号

public:
    // F0 估计算法选择
    enum class F0_MODE {
        F0_MODE_UNKNOWN = 0,
        F0_MODE_HARVEST = 1,  // 高精度，慢
        F0_MODE_DIO = 2,      // 快速，中等精度
    };

    // 配置参数
    std::string version;
    bool debug_mode = false;
    double model_amp = 0.85;                      // AutoAMP 强度
    double audio_model_frame_period = (1000.0 * 256 / 44100);  // 帧周期
    bool custom_fft_size = false;                 // 是否自定义 FFT
    int fft_size = 1024;                          // FFT 大小
    F0_MODE f0_mode = F0_MODE::F0_MODE_HARVEST;  // F0 算法
    int f0_speed = 1;                             // DIO 速度系数
    double f0_dio_floor = 40.0;                   // DIO F0 下限
    double f0_harvest_floor = 40.0;               // Harvest F0 下限
    double f0_cheap_trick_floor = 71.0;           // CheapTrick F0 下限
    double f0_allow_range = 0.1;                  // DIO 允许范围
    double ap_threshold = 0.10;                   // D4C 阈值

public:
    static std::string get_f0_mode_str(F0_MODE f0_mode);

private:
    std::string version_data;
    void make_ver();  // 生成版本校验码
};
```

### 参数详解

| 参数 | 默认值 | 作用 | 影响 |
|------|--------|------|------|
| `model_amp` | 0.85 | AutoAMP 强度 | 音量归一化 |
| `audio_model_frame_period` | ~5.8ms | 分析帧周期 | 时间分辨率 |
| `fft_size` | 1024 | FFT 大小 | 频谱分辨率 |
| `f0_mode` | HARVEST | F0 算法 | 分析精度/速度 |
| `f0_speed` | 1 | DIO 降采样 | DIO 处理速度 |
| `f0_dio_floor` | 40Hz | DIO F0 下限 | 低音分析范围 |
| `f0_harvest_floor` | 40Hz | Harvest F0 下限 | 低音分析范围 |
| `f0_cheap_trick_floor` | 71Hz | CheapTrick F0 下限 | 频谱包络质量 |
| `f0_allow_range` | 0.1 | DIO 允许范围 | F0 稳定性 |
| `ap_threshold` | 0.10 | D4C 阈值 | 清浊音判定 |

### make_ver() 版本校验生成

```cpp
void lessConfigure::make_ver() {
    // 将所有关键参数拼接为字符串
    version_data = std::to_string(audio_model_frame_period)
                   + std::to_string(fft_size)
                   + std::to_string(model_amp)
                   + std::to_string(f0_speed)
                   + std::to_string(f0_dio_floor)
                   + std::to_string(f0_harvest_floor)
                   + std::to_string(f0_cheap_trick_floor)
                   + std::to_string(f0_allow_range)
                   + std::to_string(ap_threshold)
                   + get_f0_mode_str(f0_mode);

    // 使用 SHA-1 生成校验码
    SHA1 checksum;
    checksum.update(version_data);
    version_data = checksum.final();  // 返回 40 字符十六进制字符串
}
```

**版本校验机制原理**：

1. **参数串联**：将所有影响音频分析结果的参数连接成字符串
2. **SHA-1 哈希**：生成 160 位（40 字符）的唯一校验码
3. **模型绑定**：音频模型文件存储生成时的校验码
4. **加载验证**：加载模型时比对校验码，确保配置一致

---

## SHA1 类实现

SHA1 类提供了 SHA-1 哈希算法的 C++ 实现，用于生成配置版本校验码。

### 类定义

```cpp
class SHA1 {
public:
    SHA1();

    void update(const std::string &s);  // 添加数据
    void update(std::istream &is);      // 从流添加
    std::string final();                // 完成并返回哈希

    static std::string from_file(const std::string &filename);  // 文件哈希

private:
    uint32_t digest[5]{};      // 5 个 32 位哈希值（共 160 位）
    std::string buffer;        // 输入缓冲区
    uint64_t transforms{};     // 变换次数
};
```

### SHA-1 算法核心

SHA-1 算法将输入数据分块处理，每块 512 位（64 字节）：

```cpp
void transform(uint32_t digest[], uint32_t block[16], uint64_t &transforms) {
    // 复制当前哈希值到工作变量
    uint32_t a = digest[0];
    uint32_t b = digest[1];
    uint32_t c = digest[2];
    uint32_t d = digest[3];
    uint32_t e = digest[4];

    // 80 轮变换（分为 4 组，每组 20 轮）
    // R0: 轮 0-15（使用原始数据）
    // R1: 轮 16-19（使用扩展数据）
    // R2: 轮 20-39
    // R3: 轮 40-59
    // R4: 轮 60-79

    // ... 80 轮处理 ...

    // 更新哈希值
    digest[0] += a;
    digest[1] += b;
    digest[2] += c;
    digest[3] += d;
    digest[4] += e;

    transforms++;
}
```

**SHA-1 处理流程**：

1. **初始化**：设置 5 个初始哈希值（魔数）
2. **填充**：将输入数据补齐到 512 位块边界
3. **分块处理**：每块进行 80 轮变换
4. **输出**：拼接 5 个 32 位值，转为 40 字符十六进制

### final() 输出函数

```cpp
std::string SHA1::final() {
    // 计算总位数
    uint64_t total_bits = (transforms * 64 + buffer.size()) * 8;

    // 填充：添加 0x80，然后补零
    buffer += (char) 0x80;
    while (buffer.size() < 64) {
        buffer += (char) 0x00;
    }

    // 处理填充块
    uint32_t block[16];
    buffer_to_block(buffer, block);

    // 如果填充超出一个块，处理两个块
    if (orig_size > 64 - 8) {
        transform(digest, block, transforms);
        for (size_t i = 0; i < 16 - 2; i++) {
            block[i] = 0;
        }
    }

    // 在最后 8 字节存储总位数
    block[16 - 1] = (uint32_t) total_bits;
    block[16 - 2] = (uint32_t) (total_bits >> 32);
    transform(digest, block, transforms);

    // 输出十六进制字符串
    std::ostringstream result;
    for (unsigned int i: digest) {
        result << std::hex << std::setfill('0') << std::setw(8);
        result << i;
    }

    return result.str();  // 40 字符十六进制
}
```

---

## ConfigUnit 类详解

ConfigUnit 负责全局配置的加载和管理。

### 类定义

```cpp
class ConfigUnit {
public:
    explicit ConfigUnit(const std::filesystem::path &exec_path);

    void SetConfig(const std::filesystem::path &exec_path);
    ~ConfigUnit();

    lessConfigure GetConfig() const;

private:
    std::filesystem::path config_file_path;
    std::string config_file_data_string;
    inicpp::config config;
    inicpp::schema config_schema;
    lessConfigure configure;

private:
    void make_schema();           // 创建配置结构
    void create_default_config(); // 生成默认配置
    void parse_config();          // 解析配置文件
};
```

### SetConfig() 加载流程

```cpp
void ConfigUnit::SetConfig(const std::filesystem::path &exec_path) {
    // 构建配置文件路径
    this->config_file_path = exec_path / CONFIGFILENAME;  // "lessconfig.ini"

    // 创建配置结构（定义有效参数）
    make_schema();

    // 检查配置文件是否存在
    if (std::filesystem::exists(config_file_path)) {
        // 存在：读取并解析
        config_file_data_string = ConfigFileIO::read_config_file(config_file_path);
        parse_config();
    } else {
        // 不存在：生成默认配置
        create_default_config();
        ConfigFileIO::save_config_file(config_file_path, config_file_data_string);
        parse_config();
    }
}
```

### make_schema() 配置结构定义

```cpp
void ConfigUnit::make_schema() {
    // [config] 全局设置部分
    inicpp::section_schema_params section_config_params{};
    section_config_params.name = "config";
    section_config_params.comment = "\n============ Gobal Settings ===========\n";
    section_config_params.requirement = inicpp::item_requirement::mandatory;
    config_schema.add_section(section_config_params);

    // version: 软件版本号
    inicpp::option_schema_params<inicpp::string_ini_t> version{};
    version.name = "version";
    version.default_value = PROJECT_GIT_HASH;
    config_schema.add_option("config", version);

    // debug: 调试模式开关
    inicpp::option_schema_params<inicpp::boolean_ini_t> debug{};
    debug.name = "debug";
    debug.default_value = "0";
    config_schema.add_option("config", debug);

    // [audio_model] 音频模型部分
    inicpp::section_schema_params section_audio_model_params{};
    section_audio_model_params.name = "audio_model";
    section_audio_model_params.comment = 
        "\n========= Audio Model Settings ========\n"
        "Note: modifying any of the parameters here will require remodeling the voice db\n";
    config_schema.add_section(section_audio_model_params);

    // frame_period: 帧周期
    inicpp::option_schema_params<inicpp::float_ini_t> frame_period{};
    frame_period.name = "frame_period";
    frame_period.default_value = std::to_string(configure.audio_model_frame_period);
    config_schema.add_option("audio_model", frame_period);

    // fft_size: FFT 大小（支持 "auto" 或数值）
    inicpp::option_schema_params<inicpp::float_ini_t> fft_size{};
    fft_size.name = "fft_size";
    fft_size.default_value = "auto";
    config_schema.add_option("audio_model", fft_size);

    // model_amp: AutoAMP 强度
    inicpp::option_schema_params<inicpp::float_ini_t> model_amp{};
    model_amp.name = "model_amp";
    model_amp.default_value = std::to_string(configure.model_amp);
    model_amp.comment = "Apply AutoAMP before Modeling...";
    config_schema.add_option("audio_model", model_amp);

    // [f0] F0 估计部分
    // ... 类似结构定义 f0_mode, f0_speed, f0_floor 等参数

    // [ap] 非周期性部分
    // ... 定义 ap_threshold 参数
}
```

### parse_config() 解析函数

```cpp
void ConfigUnit::parse_config() {
    // 使用 inicpp 解析 INI 文件
    config = inicpp::parser::load(config_file_data_string);

    // 解析 [config] 部分
    auto config_section = config["config"];
    configure.version = config_section["version"].get<inicpp::string_ini_t>();
    if (configure.version != PROJECT_GIT_HASH) {
        YALL_WARN_ << "Configure file version does not match software version.";
    }
    configure.debug_mode = config_section["debug"].get<inicpp::boolean_ini_t>();

    // 解析 [audio_model] 部分
    auto audio_model_section = config["audio_model"];
    configure.audio_model_frame_period = 
        audio_model_section["frame_period"].get<inicpp::float_ini_t>();
    configure.model_amp = 
        audio_model_section["model_amp"].get<inicpp::float_ini_t>();

    // FFT 大小：特殊处理 "auto" 字符串
    if (audio_model_section["fft_size"].get<inicpp::string_ini_t>() == "auto") {
        configure.fft_size = 0;
        configure.custom_fft_size = false;
    } else {
        std::stringstream ss;
        ss << audio_model_section["fft_size"].get<inicpp::string_ini_t>();
        ss >> configure.fft_size;
        configure.custom_fft_size = true;
    }

    // 解析 [f0] 部分
    auto f0_section = config["f0"];
    
    // F0 算法：字符串转枚举
    configure.f0_mode = [&]() -> lessConfigure::F0_MODE {
        auto f0_mode = f0_section["f0_mode"].get<inicpp::string_ini_t>();
        std::transform(f0_mode.begin(), f0_mode.end(), f0_mode.begin(), ::toupper);
        if (f0_mode == "DIO")
            return lessConfigure::F0_MODE::F0_MODE_DIO;
        else if (f0_mode == "HARVEST")
            return lessConfigure::F0_MODE::F0_MODE_HARVEST;
        else
            return lessConfigure::F0_MODE::F0_MODE_UNKNOWN;
    }();

    configure.f0_speed = static_cast<int>(f0_section["f0_speed"].get<inicpp::signed_ini_t>());
    configure.f0_dio_floor = f0_section["f0_dio_floor"].get<inicpp::float_ini_t>();
    configure.f0_harvest_floor = f0_section["f0_harvest_floor"].get<inicpp::float_ini_t>();
    configure.f0_cheap_trick_floor = f0_section["f0_cheap_trick_floor"].get<inicpp::float_ini_t>();
    configure.f0_allow_range = f0_section["f0_allow_range"].get<inicpp::float_ini_t>();

    // 解析 [ap] 部分
    auto ap_section = config["ap"];
    configure.ap_threshold = ap_section["ap_threshold"].get<inicpp::float_ini_t>();
}
```

---

## 配置文件格式

生成的配置文件 `lessconfig.ini` 格式如下：

```ini
============ Gobal Settings ===========

[config]
version = <git_hash>
debug = 0

========= Audio Model Settings ========
Note: modifying any of the parameters here will require remodeling the voice db

[audio_model]
frame_period = 5.80499
fft_size = auto
model_amp = 0.85

============= F0 Settings =============
Note: modifying any of the parameters here will require remodeling the voice db

[f0]
f0_mode = HARVEST
f0_speed = 1
f0_dio_floor = 40.0
f0_harvest_floor = 40.0
f0_cheap_trick_floor = 71.0
f0_allow_range = 0.1

============= AP Settings =============

[ap]
ap_threshold = 0.10
```

---

## ConfigVoiceBank 类详解

ConfigVoiceBank 允许为特定的音源库覆盖全局配置。

### 类定义

```cpp
class ConfigVoiceBank {
public:
    ConfigVoiceBank(std::filesystem::path _voice_path, lessConfigure _configure);
    explicit ConfigVoiceBank(lessConfigure _configure);

    void SetVoiceConfig();

private:
    lessConfigure configure;
    std::filesystem::path voice_path;
    std::filesystem::path voice_config_path;
    inicpp::config config;
    inicpp::schema config_schema;
    std::string config_file_data_string;

private:
    void parse_config();
};
```

### 音源库配置机制

```cpp
void ConfigVoiceBank::SetVoiceConfig() {
    // 构建音源库配置文件路径
    voice_config_path = voice_path / VOIICEBANKCONFIGFILENAME;
    
    if (voice_config_path.empty()) {
        throw file_open_error("Configure file: " + voice_config_path.string());
    }
}

void ConfigVoiceBank::parse_config() {
    // 解析音源库配置（结构同全局配置）
    config = inicpp::parser::load(config_file_data_string);

    // 覆盖全局配置参数
    auto audio_model_section = config["audio_model"];
    configure.audio_model_frame_period = audio_model_section["frame_period"].get<inicpp::float_ini_t>();
    configure.model_amp = audio_model_section["model_amp"].get<inicpp::float_ini_t>();
    
    // ... 其他参数覆盖
}
```

**使用场景**：

不同音源库可能有不同的录制条件：
- 采样率不同 → 需要调整帧周期
- 音量不均 → 需要调整 model_amp
- 低音音源 → 需要降低 f0_floor

---

## 配置层次结构

```
┌─────────────────────────────┐
│   lessconfig.ini            │ 全局配置
│   (exec_path/lessconfig.ini)│
└──────────────────┬──────────┘
                   │ 默认值
                   ▼
┌─────────────────────────────┐
│   lessConfigure              │ 配置数据结构
│   - 全局参数                 │
│   - get_version() → SHA-1   │
└──────────────────┬──────────┘
                   │
                   ▼
┌─────────────────────────────┐
│   voicebankconfig.ini       │ 音源库配置（可选）
│   (voice_path/...)          │
└──────────────────┬──────────┘
                   │ 覆盖
                   ▼
┌─────────────────────────────┐
│   lessConfigure              │ 最终配置
│   - 全局参数                 │
│   - 音源库覆盖               │
│   - 版本校验码               │
└─────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────┐
│   AudioModel 生成            │
│   - 存储版本校验码           │
└─────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────┐
│   AudioModel 加载            │
│   - 验证版本校验码           │
│   - 不匹配则重新生成         │
└─────────────────────────────┘
```

---

## 版本校验流程

### 生成时（AudioModelIO）

```cpp
void AudioModelIO::SaveAudioModel(...) {
    // 生成版本校验码
    std::string version = configure.get_version();

    // 写入文件头
    file.write("shine", 6);  // 文件标识

    // 写入版本校验码长度和内容
    size_t ver_size = version.size();
    file.write(reinterpret_cast<const char*>(&ver_size), sizeof(size_t));
    file.write(version.c_str(), ver_size);

    // 写入音频参数...
}
```

### 加载时（AudioModelIO）

```cpp
bool AudioModelIO::CheckAudioModelVersion(const lessConfigure &configure) {
    // 读取文件标识
    char header[6];
    file.read(header, 6);
    if (strcmp(header, "shine") != 0) {
        throw header_check_error("Header: ...");
    }

    // 读取存储的版本校验码
    size_t ver_size;
    file.read(reinterpret_cast<char*>(&ver_size), sizeof(size_t));
    std::string stored_version(ver_size, '\0');
    file.read(&stored_version[0], ver_size);

    // 计算当前配置的版本校验码
    std::string current_version = configure.get_version();

    // 比对
    if (stored_version != current_version) {
        throw file_version_error("Version Mismatch");
    }

    return true;
}
```

---

## 使用示例

```cpp
#include "ConfigUnit/ConfigUnit.h"
#include "ConfigUnit/ConfigVoiceBank.h"

// 获取可执行文件路径
std::filesystem::path exec_path = std::filesystem::weakly_canonical(argv[0]).parent_path();

// 加载全局配置
ConfigUnit configUnit(exec_path);
lessConfigure configure = configUnit.GetConfig();

// 加载音源库配置（可选）
std::filesystem::path voice_path = "path/to/voicebank";
ConfigVoiceBank voiceBank(voice_path, configure);
// configure 现在包含音源库覆盖后的参数

// 获取版本校验码
std::string version = configure.get_version();
// 如: "a1b2c3d4e5f6789012345678901234567890abcd"

// 验证音频模型版本
AudioModelIO audioModelIO(input_file);
if (!audioModelIO.CheckAudioModel(configure)) {
    // 版本不匹配，需要重新生成
    GenerateAudioModel(input_file, configure);
}
```
