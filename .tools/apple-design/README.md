# UI 设计系统

本文件夹包含复刻 iOS 系统风格应用所需的完整设计指南和工具。

## 📁 文件说明

### 1. iOS系统风格设计指南.md
完整的设计规范文档，包括：
- 颜色系统（语义化颜色、系统颜色）
- 字体系统（动态字体、固定字体）
- 圆角与形状（.continuous 详解）
- 间距与布局（页面、卡片、元素）
- 阴影与层次（参数说明）
- 卡片设计（标准模板）
- 导航与标签栏（TabView、NavigationStack）
- 完整示例代码

### 2. DesignTokens.swift ⭐
可直接在项目中使用的设计令牌代码：
- `DesignTokens.Colors` - 颜色系统
- `DesignTokens.Typography` - 字体系统
- `DesignTokens.Spacing` - 间距系统
- `DesignTokens.CornerRadius` - 圆角系统
- `DesignTokens.Shadow` - 阴影系统
- View Extensions - 便捷修饰符

### 3. DesignTokensShowcase.swift 🎨
**可运行的设计令牌展示页面**，包含 4 个标签页：
- **颜色** - 所有可用颜色的可视化展示
- **字体** - 固定和动态字体系统展示
- **卡片** - 各种卡片样式模板
- **组件** - 按钮、圆角对比、阴影、间距、图标

### 4. 使用说明.md
如何运行和查看设计令牌展示页面的详细说明

## 🚀 快速开始

### 使用设计令牌

1. 将 `DesignTokens.swift` 添加到你的 Xcode 项目
2. 直接使用预定义的设计令牌：

```swift
import SwiftUI

struct MyCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text("标题")
                .font(DesignTokens.Typography.cardTitle)
                .foregroundStyle(DesignTokens.Colors.Text.primary)
            
            Text("内容")
                .font(DesignTokens.Typography.caption)
                .foregroundStyle(DesignTokens.Colors.Text.secondary)
        }
        .cardStyle()  // 应用标准卡片样式
    }
}
```

### 使用设计指南

参考 `iOS系统风格设计指南.md` 了解：
- 为什么使用 `.continuous` 圆角
- 如何选择合适的颜色
- 间距和布局的最佳实践
- 完整的示例代码

## 🎯 核心原则

1. **使用 `.continuous` 圆角** - 这是 iOS 系统 UI 的标准
2. **语义化颜色优先** - 自动适配深色模式
3. **轻微的阴影** - 表现层次而非立体感
4. **一致的间距** - 使用 8pt 栅格系统
5. **动态字体支持** - 适配用户字体大小偏好

## 📚 参考资源

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [SF Symbols](https://developer.apple.com/sf-symbols/)
- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui/)

## 💡 最佳实践

### ✅ 推荐做法

```swift
// 使用语义化颜色
.foregroundStyle(.primary)

// 使用连续曲线圆角
RoundedRectangle(cornerRadius: 20, style: .continuous)

// 使用设计令牌
.padding(DesignTokens.Spacing.lg)

// 轻微阴影
.shadow(color: .black.opacity(0.08), radius: 15, y: 8)
```

### ❌ 避免做法

```swift
// 硬编码颜色（不支持深色模式）
.foregroundStyle(Color.black)

// 使用标准圆角（不是 iOS 风格）
RoundedRectangle(cornerRadius: 20, style: .circular)

// 不一致的间距
.padding(13)

// 过重的阴影
.shadow(radius: 50)
```

## 🔄 更新日志

- **2025-11-11**: 初始版本
  - 完整的设计指南文档
  - DesignTokens 代码库
  - 使用示例和最佳实践

---

**维护者**: iOS 系统风格复刻项目  
**版本**: 1.0.0  
**适用于**: iOS 18+, SwiftUI 6.0+

