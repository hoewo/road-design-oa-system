# iOS 系统风格设计指南

> 本指南总结了复刻 iOS 系统应用（如健康 App）所需的核心设计原则和技术要点

---

## 📋 目录

1. [设计系统概述](#设计系统概述)
2. [颜色系统](#颜色系统)
3. [字体系统](#字体系统)
4. [圆角与形状](#圆角与形状)
5. [间距与布局](#间距与布局)
6. [阴影与层次](#阴影与层次)
7. [卡片设计](#卡片设计)
8. [导航与标签栏](#导航与标签栏)
9. [完整示例代码](#完整示例代码)

---

## 设计系统概述

### 核心原则

1. **使用语义化 API**：优先使用系统提供的语义化颜色、字体，而非硬编码
2. **支持动态特性**：自动适配深色模式、字体大小调整、无障碍功能
3. **连续曲线优先**：所有圆角使用 `.continuous` 样式
4. **遵循 HIG**：参考 Apple Human Interface Guidelines

### Apple 未公开的内容

苹果**没有公开**系统应用的具体 UI 参数：
- ❌ 卡片阴影的精确数值
- ❌ 标题/副标题的具体颜色色值
- ❌ 精确的间距和边距像素值
- ❌ 系统应用专用的主题色

### Apple 已公开的设计系统

通过系统 API 提供的语义化设计令牌：
- ✅ 语义化颜色（label, systemBackground 等）
- ✅ 动态字体系统（.title, .body 等）
- ✅ 系统材质效果（Material）
- ✅ SF Symbols 图标系统

---

## 颜色系统

### 1. 文本颜色（自动适配深色模式）

```swift
// 主要文本 - 用于标题、重要内容
.foregroundStyle(.primary)
// 或
Color.label

// 次要文本 - 用于副标题、说明文字
.foregroundStyle(.secondary)
// 或
Color.secondaryLabel

// 三级文本 - 用于辅助信息
Color.tertiaryLabel

// 四级文本 - 用于禁用状态
Color.quaternaryLabel
```

### 2. 背景颜色

```swift
// 主背景 - 页面背景
Color.systemBackground          // 白色（浅色模式）/ 黑色（深色模式）

// 二级背景 - 卡片背景
Color.secondarySystemBackground // 浅灰（浅色）/ 深灰（深色）

// 三级背景 - 嵌套内容
Color.tertiarySystemBackground

// 分组背景（用于列表）
Color.systemGroupedBackground
Color.secondarySystemGroupedBackground
Color.tertiarySystemGroupedBackground
```

### 3. 系统颜色（固定色值）

```swift
// 仅在需要固定颜色时使用（不会随深色模式变化）
Color.blue
Color.red
Color.yellow
Color.green
// 等等...

// 健康 App 常用配色
Color(red: 0.11, green: 0.46, blue: 0.98)  // iOS 蓝色
Color(red: 0.99, green: 0.75, blue: 0.79)  // 粉色
Color(red: 0.74, green: 0.89, blue: 1.0)   // 浅蓝色
```

### 4. 实践建议

```swift
// ✅ 推荐：使用语义化颜色
Text("标题")
    .foregroundStyle(.primary)

Text("副标题")
    .foregroundStyle(.secondary)

// ❌ 避免：硬编码颜色
Text("标题")
    .foregroundStyle(Color.black)  // 深色模式下会不可见
```

---

## 字体系统

### 1. 动态字体（推荐）

iOS 提供的动态字体会自动适配用户的字体大小偏好设置：

```swift
.font(.largeTitle)    // 34pt - 页面主标题
.font(.title)         // 28pt - 区块标题
.font(.title2)        // 22pt - 次级标题
.font(.title3)        // 20pt - 三级标题
.font(.headline)      // 17pt - 加粗，强调内容
.font(.body)          // 17pt - 正文
.font(.callout)       // 16pt - 说明文字
.font(.subheadline)   // 15pt - 副标题
.font(.footnote)      // 13pt - 脚注
.font(.caption)       // 12pt - 图片说明
.font(.caption2)      // 11pt - 最小文字
```

### 2. 自定义字体大小（需要时）

```swift
// 固定大小（不会随用户设置变化）
.font(.system(size: 20, weight: .semibold))

// 常用权重
.regular    // 400
.medium     // 500
.semibold   // 600
.bold       // 700
```

### 3. 健康 App 字体使用参考

```swift
// 页面大标题
Text("摘要")
    .font(.system(size: 38, weight: .bold))

// 卡片标题
Text("音量达到 100 分贝。")
    .font(.system(size: 20, weight: .semibold))

// 正文
Text("置身于此音量中几分钟就可能导致暂时性听力损伤。")
    .font(.system(size: 15))
    .foregroundStyle(.secondary)

// 按钮文字
Text("更多详细信息")
    .font(.system(size: 15, weight: .semibold))

// 时间/日期
Text("11月6日")
    .font(.system(size: 15))
    .foregroundStyle(.secondary)
```

### 4. 实践建议

```swift
// ✅ 优先使用动态字体
Text("内容")
    .font(.body)

// ✅ 需要精确控制时使用固定大小
Text("特殊标题")
    .font(.system(size: 20, weight: .semibold))

// ❌ 避免混用多种字体大小体系
```

---

## 圆角与形状

### 1. 连续曲线圆角（.continuous）⭐

**这是 iOS 系统 UI 的标准样式**，必须使用！

```swift
RoundedRectangle(cornerRadius: 20, style: .continuous)
```

#### 为什么使用 .continuous？

- 使用超椭圆曲线（Squircle），曲率渐变
- 视觉过渡更平滑、更自然
- 所有 iOS 系统 UI（卡片、按钮、图标）都使用这种曲线
- 从 iPhone X 开始的设备屏幕圆角也是这种样式

#### 对比示例

```swift
// ❌ 标准圆角（不推荐用于 iOS 风格）
RoundedRectangle(cornerRadius: 20, style: .circular)
// 曲率恒定，转折生硬

// ✅ 连续曲线（iOS 标准）
RoundedRectangle(cornerRadius: 20, style: .continuous)
// 曲率渐变，过渡柔和
```

### 2. 常用圆角半径

```swift
// 大卡片
.clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))

// 中等卡片
.clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

// 按钮
.clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

// 小元素
.clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

// 图标
.clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
```

### 3. 形状修饰符

```swift
// 方式 1：使用 clipShape
VStack {
    // 内容
}
.background(Color.white)
.clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))

// 方式 2：直接作为背景
VStack {
    // 内容
}
.background(
    RoundedRectangle(cornerRadius: 20, style: .continuous)
        .fill(Color.white)
)
```

---

## 间距与布局

### 1. 页面级间距

```swift
// 页面左右边距
.padding(.horizontal, 20)  // 或 24

// 页面顶部间距
.padding(.top, 20)

// 页面底部间距（避开 TabBar）
.padding(.bottom, 80)
```

### 2. 卡片间距

```swift
// 卡片之间的间距
VStack(spacing: 20) {
    Card1()
    Card2()
    Card3()
}

// 卡片内边距
.padding(20)  // 或 24
```

### 3. 元素间距

```swift
// 标题和内容的间距
VStack(spacing: 12) {
    Text("标题")
    Text("内容")
}

// 图标和文字的间距
HStack(spacing: 12) {
    Image(systemName: "heart.fill")
    Text("摘要")
}

// 按钮内间距
.padding(.horizontal, 18)
.padding(.vertical, 9)
```

### 4. 健康 App 布局参考

```swift
ScrollView {
    VStack(alignment: .leading, spacing: 24) {
        // 页面标题区
        header
            .padding(.horizontal, 24)
            .padding(.top, 20)
        
        // 卡片列表
        VStack(spacing: 20) {
            card1
            card2
            card3
        }
        .padding(.horizontal, 24)
        
        // 底部留白（避开 TabBar）
        Spacer(minLength: 80)
    }
}
```

---

## 阴影与层次

### 1. 卡片阴影

iOS 的卡片阴影通常很轻微，用于表现层次而非强烈的立体感：

```swift
// 标准卡片阴影
.shadow(color: Color.black.opacity(0.08), radius: 15, x: 0, y: 8)

// 轻微阴影
.shadow(color: Color.black.opacity(0.05), radius: 10, x: 0, y: 5)

// 悬浮效果（较强）
.shadow(color: Color.black.opacity(0.12), radius: 20, x: 0, y: 10)
```

### 2. 阴影参数说明

```swift
.shadow(
    color: Color.black.opacity(0.08),  // 颜色：黑色 8% 透明度
    radius: 15,                         // 模糊半径：越大越柔和
    x: 0,                              // 水平偏移：通常为 0
    y: 8                               // 垂直偏移：向下偏移
)
```

### 3. 不同元素的阴影

```swift
// 大卡片
.shadow(color: .black.opacity(0.08), radius: 20, y: 12)

// 中等卡片
.shadow(color: .black.opacity(0.06), radius: 15, y: 8)

// 小卡片/按钮
.shadow(color: .black.opacity(0.05), radius: 10, y: 5)

// 悬浮按钮
.shadow(color: .black.opacity(0.1), radius: 12, y: 6)
```

### 4. 材质效果（替代阴影）

```swift
// 毛玻璃效果
.background(.regularMaterial)
.background(.thinMaterial)
.background(.ultraThinMaterial)

// 用于导航栏、底部栏等
```

---

## 卡片设计

### 核心设计原则：标准边距设计 ⭐

iOS 健康应用的卡片边距遵循特定规律，这是一个非常重要的细节：

- **左侧元素**（图标、标题）距离左边缘：**16pt**
- **右侧元素**（按钮、箭头、日期）距离右边缘：**16pt**
- **顶部元素**距离上边缘：**16pt**
- **底部元素**距离下边缘：**20-24pt**（比上边距略多）

**关键观察**：底部留白会比其他三边多一点，这样做是为了：
1. **视觉平衡** - 底部多一点留白让内容看起来更"稳定"
2. **呼吸感** - 避免内容过于紧凑
3. **阅读体验** - 给用户视觉上的停顿空间

```swift
// 示例：通知卡片的标准边距
HStack(spacing: 0) {
    // 左侧内容
    HStack(spacing: 8) {
        Image(systemName: "exclamationmark.triangle.fill")
        Text("通知标题")
    }
    .padding(.leading, 16)  // 左右等宽
    
    Spacer()
    
    // 右侧内容
    HStack(spacing: 12) {
        Text("11月6日")
        Button(action: {}) {
            Image(systemName: "xmark")
                .frame(width: 28, height: 28)
        }
    }
    .padding(.trailing, 16)  // 左右等宽
}

// 卡片内容区 - 注意底部留白更多
VStack {
    // 内容
}
.padding(.horizontal, 16)  // 左右 16pt
.padding(.top, 16)         // 上 16pt
.padding(.bottom, 20)      // 下 20pt（略多）
```

### 1. 标准卡片结构

```swift
struct StandardCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // 标题
            Text("卡片标题")
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(.primary)
            
            // 内容
            Text("卡片内容描述文字")
                .font(.system(size: 15))
                .foregroundStyle(.secondary)
            
            // 操作按钮（可选）
            Button(action: {}) {
                Text("操作按钮")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 9)
                    .background(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .fill(Color.blue)
                    )
            }
            .buttonStyle(.plain)
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(Color.white)
        )
        .shadow(color: .black.opacity(0.08), radius: 15, y: 8)
    }
}
```

### 2. 带横幅的通知卡片（健康 App 标准）⭐

**关键特点**：
- 黄色横幅标题栏（44pt 高度）
- **圆形关闭按钮**（28×28pt，带半透明背景）
- **四周等宽边距**（16pt）- 左侧图标、右侧按钮距离边缘相同

```swift
struct NotificationCard: View {
    var body: some View {
        VStack(spacing: 0) {
            // 黄色横幅 - 注意等宽边距
            HStack(spacing: 0) {
                // 左侧：图标 + 标题
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.orange)
                    
                    Text("噪声通知")
                        .font(.system(size: 15, weight: .semibold))
                }
                .padding(.leading, 16)  // 左侧等宽边距
                
                Spacer()
                
                // 右侧：日期 + 圆形关闭按钮
                HStack(spacing: 12) {
                    Text("11月6日")
                        .font(.system(size: 15))
                        .foregroundStyle(.secondary)
                    
                    // ⭐ 圆形关闭按钮
                    Button(action: {}) {
                        Image(systemName: "xmark")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(.secondary)
                            .frame(width: 28, height: 28)
                            .background(
                                Circle()
                                    .fill(Color.black.opacity(0.05))
                            )
                    }
                    .buttonStyle(.plain)
                }
                .padding(.trailing, 16)  // 右侧等宽边距
            }
            .frame(height: 44)
            .background(Color.yellow)
            
            // 内容区 - 注意底部留白更多
            VStack(alignment: .leading, spacing: 16) {
                HStack(alignment: .top, spacing: 16) {
                    Image(systemName: "ear.fill")
                        .font(.system(size: 42))
                        .foregroundStyle(.blue)
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Text("音量达到 100 分贝。")
                            .font(.system(size: 20, weight: .semibold))
                        
                        Text("置身于此音量中几分钟就可能导致暂时性听力损伤。")
                            .font(.system(size: 15))
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 16)
            .padding(.bottom, 20)  // 底部略多
            .background(Color.white)
        }
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .shadow(color: .black.opacity(0.08), radius: 15, y: 8)
    }
}
```

### 3. 图标 + 内容卡片

```swift
struct IconCard: View {
    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            // 左侧图标
            Image(systemName: "heart.fill")
                .font(.system(size: 42))
                .foregroundStyle(.red)
            
            // 右侧内容
            VStack(alignment: .leading, spacing: 8) {
                Text("标题")
                    .font(.system(size: 18, weight: .semibold))
                
                Text("描述文字")
                    .font(.system(size: 15))
                    .foregroundStyle(.secondary)
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(Color.white)
        )
        .shadow(color: .black.opacity(0.06), radius: 12, y: 6)
    }
}
```

### 4. 卡片设计要点

- ✅ 使用 `.continuous` 圆角
- ✅ **标准边距设计** ⭐ - 左、右、上边距 16pt，底部边距 20-24pt（略多）
- ✅ 左右两侧元素（图标、按钮）距离边缘保持对称（通常 16pt）
- ✅ 底部留白比上边距多 4-8pt，提供更好的视觉平衡
- ✅ 轻微阴影表现层次
- ✅ 标题使用 semibold 字重
- ✅ 描述文字使用 secondary 颜色
- ✅ 按钮使用圆角矩形背景
- ✅ 通知卡片的关闭按钮使用圆形背景（28×28pt）

---

## 导航与标签栏

### 1. TabView（iOS 标准）

```swift
struct ContentView: View {
    var body: some View {
        TabView {
            Tab("摘要", systemImage: "heart.fill") {
                SummaryView()
            }
            
            Tab("共享", systemImage: "person.2.fill") {
                SharingView()
            }
            
            // 搜索标签（特殊类型）
            TabSection {
                Tab(role: .search) {
                    SearchView()
                }
            }
        }
    }
}
```

### 2. 搜索标签的正确用法（iOS 18+）

**重要**：搜索标签是 TabBar 中的特殊类型，必须使用 `Tab(role: .search)` 创建。

```swift
@State private var searchText = ""

var body: some View {
    TabView {
        Tab("摘要", systemImage: "heart.fill") {
            SummaryView()
        }
        
        Tab("共享", systemImage: "person.2.fill") {
            SharingView()
        }
        
        // ✅ 正确：使用 Tab(role: .search)
        TabSection {
            Tab(role: .search) {
                SearchView(searchText: $searchText)
            }
        }
    }
}
```

#### 搜索视图的标准实现

```swift
struct SearchView: View {
    @Binding var searchText: String
    
    var body: some View {
        NavigationStack {
            List {
                if searchText.isEmpty {
                    // 空状态视图
                    ContentUnavailableView.search
                } else {
                    // 搜索结果
                    Text("搜索: \(searchText)")
                }
            }
            .navigationTitle("搜索")
            .searchable(text: $searchText, prompt: "搜索")
        }
    }
}
```

#### 搜索标签的特点

1. **自动显示放大镜图标** - 无需手动指定 `systemImage`
2. **位置固定** - 始终显示在 TabBar 最右侧
3. **包装在 TabSection 中** - 与普通标签分组显示
4. **必须配合 .searchable()** - 提供搜索输入框

```swift
// ❌ 错误做法
Tab("搜索", systemImage: "magnifyingglass") {
    SearchView()
}

// ❌ 错误：没有使用 TabSection
Tab(role: .search) {
    SearchView()
}

// ✅ 正确做法
TabSection {
    Tab(role: .search) {
        SearchView()
            .searchable(text: $searchText)
    }
}
```

### 3. NavigationStack

```swift
NavigationStack {
    ScrollView {
        // 内容
    }
    .navigationTitle("标题")
    .navigationBarTitleDisplayMode(.large)  // 大标题
}
```

---

## 完整示例代码

### 健康 App 风格的噪声通知卡片

```swift
struct NoiseNotificationCard: View {
    private let noiseData: [CGFloat] = [28, 32, 40, 50, 60, 115, 62, 55, 48, 36]
    
    var body: some View {
        VStack(spacing: 0) {
            // 黄色横幅
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 15))
                    .foregroundStyle(.orange)
                
                Text("噪声通知")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.primary)
                
                Spacer()
                
                Text("11月6日")
                    .font(.system(size: 15))
                    .foregroundStyle(.secondary)
                
                Button(action: {}) {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 14)
            .background(Color.yellow)
            
            // 白色内容区
            VStack(alignment: .leading, spacing: 16) {
                // 图标 + 标题
                HStack(alignment: .top, spacing: 16) {
                    Image(systemName: "ear.fill")
                        .font(.system(size: 42))
                        .foregroundStyle(Color.blue)
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Text("音量达到 100 分贝。")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundStyle(.primary)
                        
                        Text("置身于此音量中几分钟就可能导致暂时性听力损伤。")
                            .font(.system(size: 15))
                            .foregroundStyle(.secondary)
                    }
                }
                
                // 操作按钮
                Button(action: {}) {
                    Text("更多详细信息")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 18)
                        .padding(.vertical, 9)
                        .background(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .fill(Color.blue)
                        )
                }
                .buttonStyle(.plain)
                
                // 图表
                noiseChart
            }
            .padding(20)
            .background(Color.white)
        }
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .shadow(color: .black.opacity(0.08), radius: 15, y: 8)
    }
    
    private var noiseChart: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .bottom) {
                Text("90 分贝")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Color.blue)
                    .frame(height: 120, alignment: .bottom)
                
                Spacer()
                
                // 柱状图
                HStack(alignment: .bottom, spacing: 4) {
                    ForEach(Array(noiseData.enumerated()), id: \.offset) { index, value in
                        RoundedRectangle(cornerRadius: 3, style: .continuous)
                            .fill(getBarColor(index: index))
                            .frame(width: 12, height: value)
                    }
                }
                
                VStack(spacing: 2) {
                    Spacer()
                    Text("最高")
                        .font(.system(size: 11, weight: .semibold))
                    Text("115")
                        .font(.system(size: 13, weight: .bold))
                }
                .foregroundStyle(Color.blue)
                .frame(height: 120)
            }
            
            // 时间轴
            HStack {
                Text("12:24")
                Spacer()
                Text("12:39")
            }
            .font(.system(size: 12))
            .foregroundStyle(.secondary)
        }
    }
    
    private func getBarColor(index: Int) -> Color {
        if index >= 4 && index <= 6 {
            return Color.blue
        } else if index >= 7 {
            return Color.gray.opacity(0.35)
        } else {
            return Color.blue.opacity(0.5)
        }
    }
}
```

---

## 🎯 关键要点总结

### 必须遵守的规则

1. **圆角**：所有圆角必须使用 `.continuous` 样式
2. **颜色**：优先使用语义化颜色（.primary, .secondary 等）
3. **字体**：使用系统字体和合适的字重
4. **阴影**：轻微、柔和，黑色 5-10% 透明度
5. **间距**：保持一致的间距体系（8, 12, 16, 20, 24）
6. **卡片边距** ⭐：左、右、上边距 16pt，底部边距 20-24pt（略多），提供视觉平衡
7. **关闭按钮**：通知卡片使用圆形背景（28×28pt），半透明黑色填充

### 推荐的工作流程

1. 截图参考系统应用
2. 使用本指南的设计令牌
3. 在真机/模拟器上对比调整
4. 测试深色模式和字体缩放
5. 使用无障碍检查器验证

### 常见错误

❌ 使用 `.circular` 圆角而非 `.continuous`  
❌ 硬编码颜色值（如 Color.black）  
❌ 阴影过重  
❌ 不支持深色模式  
❌ 间距不一致  
❌ 卡片四周使用完全相同边距（应该底部略多）  
❌ 卡片左右两侧元素距离边缘不对称  
❌ 关闭按钮使用方形背景而非圆形  
❌ 通知卡片标题字体不使用 semibold 字重  

---

## 📚 参考资源

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [SF Symbols](https://developer.apple.com/sf-symbols/)
- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui/)

---

**最后更新：** 2025-11-11  
**适用版本：** iOS 18+, SwiftUI 6.0+

