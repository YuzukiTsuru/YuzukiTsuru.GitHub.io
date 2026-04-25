---
title: 'lessampler: Utils 模块 - 工具类的设计哲学'
tags: ['lessampler', 'UTAU']
mathjax: true
date: 2026-04-25 00:00:00
---
Utils 模块提供 lessampler 的基础设施工具类，包括分级日志系统、高性能计时器、数组转换工具和自定义异常体系。这些工具类为整个项目提供一致的基础功能支持，确保代码的健壮性和可调试性。

良好的工具类设计是软件工程质量的重要体现。Utils 模块的设计遵循以下原则：
- **最小依赖**：尽量使用标准库，减少外部依赖
- **线程安全**：支持多线程环境使用
- **条件编译**：通过宏开关控制调试功能
- **语义清晰**：类名和接口设计直观易懂

## 模块结构

```
Utils/
├── LOG.h           # 分级日志系统
├── Timer.h         # 微秒精度计时器
├── VectorWrapper.h # 数组转向量模板
└── exception.h     # 自定义异常体系
```

---

## LOG.h 分级日志系统

YALL（Yet Another Logging Library）是一个分级、彩色、线程安全的日志系统。

### 日志级别定义

```cpp
enum Yall_LEVEL {
    LOG_DUMP,      // 数据转存（调试专用）
    LOG_EVAL,      // 性能评估（计时专用）
    LOG_DEBUG,     // 调试信息（包含源码位置）
    LOG_OK,        // 成功状态（绿色）
    LOG_INFO,      // 信息提示（蓝色）
    LOG_WARN,      // 警告信息（黄色）
    LOG_ERROR,     // 错误信息（红色）
    LOG_CRITICAL,  // 严重错误（红色背景）
};
```

**级别设计理念**：

| 级别 | 用途 | 条件编译 | 输出颜色 |
|------|------|----------|----------|
| DUMP | 详细数据输出 | DUMP_DATA 宏 | 白色 + 源码位置 |
| EVAL | 性能计时输出 | TIME_EVAL 宏 | 紫色 |
| DEBUG | 调试追踪 | DEBUG_MODE 宏 | 白色 + 源码位置 |
| OK | 操作成功 | 常开 | 绿色 |
| INFO | 信息提示 | 常开 | 蓝色 |
| WARN | 警告信息 | 常开 | 黄色 |
| ERROR | 错误报告 | 常开 | 红色 |
| CRITICAL | 严重错误 | 常开 | 红色背景 |

### Yall_Inst 基类

```cpp
class Yall_Inst {
public:
    explicit Yall_Inst(Yall_LEVEL logLevel) {
        this->logLevel = logLevel;
    };

    virtual void operator<<(const std::string &msg) {};

protected:
    std::string name;
    Yall_LEVEL logLevel;
    std::mutex streamMtx;  // 线程安全互斥锁
};
```

**设计要点**：
- 使用 `std::mutex` 确保多线程环境下的输出顺序
- 基类定义接口，派生类实现具体行为

### Yall_Instance 标准日志器

```cpp
class Yall_Instance : Yall_Inst {
public:
    explicit Yall_Instance(Yall_LEVEL logLevel) : Yall_Inst(logLevel) {};

    void operator<<(const std::string &msg) override {
        std::lock_guard<std::mutex> lock(streamMtx);

        switch (logLevel) {
            case Yall_LEVEL::LOG_OK:
                std::cout << cc::green << "[OKAY]" << cc::reset;
                break;
            case Yall_LEVEL::LOG_INFO:
                std::cout << cc::cyan << "[INFO]" << cc::reset;
                break;
            case Yall_LEVEL::LOG_WARN:
                std::cout << cc::yellow << "[WARN]" << cc::reset;
                break;
            case Yall_LEVEL::LOG_ERROR:
                std::cout << cc::red << "[ERRO]" << cc::reset;
                break;
            case Yall_LEVEL::LOG_CRITICAL:
                std::cout << cc::on_red << "[CRIT]" << cc::reset;
                break;
#if TIME_EVAL
            case Yall_LEVEL::LOG_EVAL:
                std::cout << cc::magenta << "[TIME]" << cc::reset;
                break;
#endif
            default:
                break;
        }
        std::cout << " " << msg << " " << std::endl;
    };
};
```

**ColorCout 库集成**：
- `cc::green`, `cc::cyan`, `cc::yellow` 等：设置文本颜色
- `cc::on_red`：设置背景色
- `cc::reset`：重置颜色

### Yall_Debug_Instance 调试日志器

```cpp
class Yall_Debug_Instance : Yall_Inst {
public:
    explicit Yall_Debug_Instance(Yall_LEVEL logLevel) : Yall_Inst(logLevel) {
        enable = false;
    }

    void SetDebugInfo(const std::string &file, const std::string &func, int line) {
        this->FILE = file;
        this->FUNC = func;
        this->LINE = line;
    }

    void EnableDebug() { enable = true; }
    void DisableDebug() { enable = false; }

    void operator<<(const std::string &msg) override {
        std::lock_guard<std::mutex> lock(streamMtx);

        switch (logLevel) {
#if DUMP_DATA
            case LOG_DUMP:
                std::cout << cc::cyan << "[FUNC] " << std::left << std::setw(23) << cc::reset << fmt(this->FUNC) << " "
                       << cc::yellow << "[FILE] " << std::setw(23) << cc::reset << fmt(this->FILE) << " "
                       << cc::green << "[LINE] " << std::setw(4) << cc::reset << this->LINE << " "
                       << cc::white << "[DUMP] " << cc::reset << msg << " " << std::endl;
                break;
#endif
            case LOG_DEBUG:
                std::cout << cc::cyan << "[FUNC] " << std::left << std::setw(23) << cc::reset << fmt(this->FUNC) << " "
                       << cc::yellow << "[FILE] " << std::setw(23) << cc::reset << fmt(this->FILE) << " "
                       << cc::green << "[LINE] " << std::setw(4) << cc::reset << this->LINE << " "
                       << cc::white << "[DEBUG] " << cc::reset << msg << " " << std::endl;
                break;
            default:
                break;
        }
    }

private:
    std::string FILE = {};
    std::string FUNC = {};
    int LINE = {};
    bool enable = false;

    // 路径截断：只保留最后 20 字符
    static std::string fmt(std::string sv) {
        if (sv.length() > 20) {
            return std::string("...") + sv.substr(sv.length() - 20, sv.length());
        } else {
            return sv;
        }
    }
};
```

**调试输出格式**：
```
[FUNC] ...WorldModule::F0Estim [FILE] ...orldModule/WorldModule.cpp [LINE]  123 [DEBUG] Estimating F0...
```

### Yall 单例管理器

```cpp
class Yall {
public:
    Yall(Yall const &) = delete;  // 禁止拷贝
    void operator=(Yall const &) = delete;  // 禁止赋值

    static Yall_Instance &GetYall(Yall_LEVEL logLevel) {
        auto it = GetInstance().yall_inst.find(logLevel);
        if (it == GetInstance().yall_inst.end()) {
            auto *logger = new Yall_Instance(logLevel);
            GetInstance().yall_inst[logLevel] = logger;
            return *logger;
        }
        return *it->second;
    };

    static Yall_Debug_Instance &GetDebugYall(Yall_LEVEL logLevel, 
        const std::string &FILE, const std::string &FUNC, int LINE) {
        auto it = GetDebugInstance().yall_debug_inst.find(logLevel);
        if (it == GetDebugInstance().yall_debug_inst.end()) {
            auto *logger = new Yall_Debug_Instance(logLevel);
            GetDebugInstance().yall_debug_inst[logLevel] = logger;
            logger->SetDebugInfo(FILE, FUNC, LINE);
            return *logger;
        }
        it->second->SetDebugInfo(FILE, FUNC, LINE);
        return *it->second;
    };

private:
    std::unordered_map<Yall_LEVEL, Yall_Instance *> yall_inst;
    std::unordered_map<Yall_LEVEL, Yall_Debug_Instance *> yall_debug_inst;

    Yall() = default;

    static Yall &GetInstance() {
        static Yall inst;
        return inst;
    };

    static Yall &GetDebugInstance() {
        static Yall inst_d;
        return inst_d;
    };
};
```

**单例模式特点**：
- 使用静态局部变量实现 Meyers 单例
- `unordered_map` 存储各级别的日志器实例
- 避免每次日志调用都创建新对象

### 宏接口定义

```cpp
// 函数名宏：GCC 使用 __PRETTY_FUNCTION__，其他使用 __func__
#if __GNUC__
#define YALL_FUNC_        __PRETTY_FUNCTION__
#else
#define YALL_FUNC_        __func__
#endif

// 日志宏定义
#define YALL_DUMP_        Yall::GetDebugYall(Yall_LEVEL::LOG_DUMP, __FILE__, YALL_FUNC_, __LINE__)
#define YALL_DEBUG_       Yall::GetDebugYall(Yall_LEVEL::LOG_DEBUG, __FILE__, YALL_FUNC_, __LINE__)
#define YALL_OK_          Yall::GetYall(Yall_LEVEL::LOG_OK)
#define YALL_EVAL_        Yall::GetYall(Yall_LEVEL::LOG_EVAL)
#define YALL_INFO_        Yall::GetYall(Yall_LEVEL::LOG_INFO)
#define YALL_WARN_        Yall::GetYall(Yall_LEVEL::LOG_WARN)
#define YALL_ERROR_       Yall::GetYall(Yall_LEVEL::LOG_ERROR)
#define YALL_CRITICAL_    Yall::GetYall(Yall_LEVEL::LOG_CRITICAL)
```

### 使用示例

```cpp
// 基本日志
YALL_INFO_ << "Starting audio processing...";
YALL_OK_ << "Model loaded successfully";
YALL_WARN_ << "Audio file is stereo, converting to mono";
YALL_ERROR_ << "Failed to open audio file";

// 调试日志（自动包含源码位置）
YALL_DEBUG_ << "Initializing WorldModule";

// 性能计时
YALL_EVAL_ << "F0 Estimation: 152ms";

// 数据转存（仅在 DUMP_DATA 宏启用时）
YALL_DUMP_ << "F0 array: [440.0, 441.5, 439.8, ...]";
```

---

## Timer.h 高精度计时器

Timer 类提供微秒级别的计时功能，用于性能分析和优化。

### 类定义

```cpp
class Timer {
public:
    Timer() {
        g_start_time = get_perf_count();  // 全局起始时间
        start_time = g_start_time;        // 当前计时起始
    };

    void SetTimer() {
        end_time = 0;
        start_time = get_perf_count();    // 重置计时
    }

    uint64_t GetTimer() {
        end_time = get_perf_count();
        return end_time - start_time;     // 返回微秒数
    }

    std::string GetTimer(const std::string &info) {
        end_time = get_perf_count();
        return [&]() -> std::string {
            auto time = end_time - start_time;
            if (time / 1000 == 0)
                return info + std::to_string(end_time - start_time) + "us";
            else
                return info + std::to_string((end_time - start_time) / 1000) + "ms";
        }();
    }

    std::string EndTimer() {
        g_end_time = get_perf_count();
        return [&]() -> std::string {
            auto time = g_end_time - g_start_time;
            if (time / 1000 == 0)
                return std::to_string(g_end_time - g_start_time) + "us";
            else
                return std::to_string((g_end_time - g_start_time) / 1000) + "ms";
        }();
    }

protected:
    uint64_t start_time = 0;
    uint64_t end_time = 0;
    uint64_t g_start_time = 0;   // 全局起始（构造时）
    uint64_t g_end_time = 0;     // 全局结束

private:
    static uint64_t get_perf_count() {
        return std::chrono::duration_cast<std::chrono::microseconds>(
            std::chrono::steady_clock::now().time_since_epoch()).count();
    };
};
```

### 计时精度

使用 `std::chrono::steady_clock`：
- **单调递增**：不受系统时间调整影响
- **高精度**：微秒级别分辨率
- **跨平台**：标准 C++11 实现

### 使用模式

```cpp
Timer timer;

// 模式1：分段计时
timer.SetTimer();
// ... 执行操作1 ...
YALL_EVAL_ << timer.GetTimer("操作1耗时: ");

timer.SetTimer();
// ... 执行操作2 ...
YALL_EVAL_ << timer.GetTimer("操作2耗时: ");

// 模式2：总计时
// ... 所有操作 ...
YALL_INFO_ << "总耗时: " + timer.EndTimer();
```

### 实际应用示例

```cpp
void lessampler::run() {
    Timer timer;

    // 音频模型检查和加载
    timer.SetTimer();
    audio_model_io.ReadAudioModel(configure);
    YALL_INFO_ << timer.GetTimer("Read Audio Model: ");

    // 音频变换处理
    timer.SetTimer();
    AudioProcess audioProcess(origin_audio_model, shine_para);
    YALL_INFO_ << timer.GetTimer("Processing Model: ");

    // 音频合成
    timer.SetTimer();
    Synthesis synthesis(trans_audio_model, shine_para.output_samples);
    YALL_INFO_ << timer.GetTimer("Synthesis Audio: ");

    // 总耗时
    YALL_OK_ << "All Process Done: " + timer.EndTimer();
}
```

---

## VectorWrapper.h 数组转向量模板

VectorWrapper 是一个简单的模板工具，用于将 C 风格数组转换为 `std::vector`。

### 类定义

```cpp
template<typename T, int N>
struct VectorWrapper {
    explicit VectorWrapper(T (&D)[N]) {
        std::copy(D, D + N, std::back_inserter(v));
    }

    std::vector<T> v;
};
```

**模板参数**：
- `T`：数组元素类型
- `N`：数组长度（编译时确定）

### 使用示例

```cpp
// C 风格数组
int arr[] = {1, 2, 3, 4, 5};

// 转换为 vector
VectorWrapper<int, 5> wrapper(arr);
std::vector<int> vec = wrapper.v;  // {1, 2, 3, 4, 5}

// 自动推导长度
double freq_table[] = {440.0, 466.16, 493.88, 523.25};
VectorWrapper<double, 4> freq_vec(freq_table);
```

**应用场景**：
- 将硬编码的数组转换为可操作的 vector
- 支持迭代器和 STL 算法
- 类型安全的数组转换

---

## exception.h 自定义异常体系

exception.h 定义了 lessampler 专用的异常类型，提供语义清晰的错误报告。

### 异常类型定义

```cpp
class file_open_error : public std::runtime_error {
public:
    explicit file_open_error(const std::string &what) 
        : std::runtime_error("Fail to open file: " + what + ".") {};
};

class header_check_error : public std::runtime_error {
public:
    header_check_error(const std::string &what, const std::string &expect) 
        : std::runtime_error("Header: " + what + " is not same as " + expect + ".") {};
};

class file_version_error : public std::runtime_error {
public:
    explicit file_version_error(const std::string &what) 
        : std::runtime_error(what + " Version Mismatch.") {};
};

class parameter_error : public std::runtime_error {
public:
    explicit parameter_error(const std::string &what) 
        : std::runtime_error("Parameter Error: " + what + ".") {};
};

class type_error : public std::runtime_error {
public:
    explicit type_error(const std::string &what) 
        : std::runtime_error("Type Error: " + what + ".") {};
};

class audio_file_error : public std::runtime_error {
public:
    explicit audio_file_error(const std::string &what) 
        : std::runtime_error("Audio File Error: " + what + ".") {};
};
```

### 异常类型对照

| 异常类型 | 使用场景 | 示例消息 |
|----------|----------|----------|
| `file_open_error` | 文件打开失败 | "Fail to open file: input.wav." |
| `header_check_error` | 文件头验证失败 | "Header: xxx is not same as shine." |
| `file_version_error` | 版本校验失败 | "Please Regenerate Audio Model Version Mismatch." |
| `parameter_error` | 参数验证失败 | "Parameter Error: offset exceeds audio length." |
| `type_error` | 类型转换错误 | "Type Error: invalid FFT size value." |
| `audio_file_error` | 音频处理错误 | "Audio File Error: unsupported format." |

### 异常处理模式

```cpp
// lessampler main.cpp
int main(int argc, char *argv[]) {
    try {
        lessampler lessampler(argc, argv);
        lessampler.run();
    } catch (const std::runtime_error &error) {
        YALL_ERROR_ << error.what();
        return -1;
    }
    return 0;
}
```

### 使用示例

```cpp
// 文件打开检查
void ConfigUnit::SetConfig(const std::filesystem::path &exec_path) {
    if (config_file_path.empty()) {
        throw file_open_error("Configure file: " + config_file_path.string());
    }
}

// 版本检查
void AudioModelIO::ReadAudioContent() {
    if (ver_string != _configure.get_version()) {
        throw file_version_error("Please Regenerate Audio Model");
    }
}

// 参数验证
void libUTAU::CheckPara(const lessAudioModel& audioModel) {
    if (utauPara.offset + utauPara.last_unused_part >= utauPara.wave_length)
        throw parameter_error("The audio offset and whitespace are greater than the required audio length");
}
```

---

## 条件编译开关设计

日志系统通过预定义宏控制输出行为：

```cpp
// 调试模式开关
#ifdef DEBUG_MODE
    // 启用 DEBUG 输出
#endif

// 数据转存开关
#ifdef DUMP_DATA
    // 启用 DUMP 输出
#endif

// 性能评估开关
#ifdef TIME_EVAL
    // 启用 EVAL 输出
#endif
```

**配置方式**：

通过 CMake 定义：
```cmake
if(CMAKE_BUILD_TYPE MATCHES Debug)
    target_compile_definitions(lessampler PRIVATE DEBUG_MODE DUMP_DATA TIME_EVAL)
endif()
```

或通过 lessconfig.ini：
```ini
[config]
debug = 1
```

---

## 工具类设计哲学总结

### LOG.h 设计要点

1. **分级输出**：不同级别用不同颜色，便于快速识别
2. **条件编译**：调试输出不影响发布版性能
3. **源码追踪**：DEBUG 级别自动附加文件名、函数名、行号
4. **线程安全**：mutex 保护多线程输出
5. **单例模式**：避免重复创建日志器对象

### Timer.h 设计要点

1. **高精度**：微秒级别，足够测量大多数操作
2. **单调时钟**：不受系统时间调整影响
3. **双模式**：支持分段计时和总计时
4. **自动格式化**：根据时长选择 μs 或 ms 单位

### VectorWrapper.h 设计要点

1. **模板推导**：自动获取数组长度，无需手动指定
2. **类型安全**：编译时检查类型匹配
3. **简单实用**：单一职责，易于理解和使用

### exception.h 设计要点

1. **继承标准异常**：符合 C++ 异常处理规范
2. **语义命名**：类名直接表达错误类型
3. **统一格式**：所有异常消息格式一致
4. **顶层捕获**：main 函数统一捕获处理