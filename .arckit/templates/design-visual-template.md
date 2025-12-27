# 视觉设计规范

**Feature**: [FEATURE NAME]  
**Created**: [DATE]  
**Platform**: [iOS / macOS / 跨平台]

<!--
  This file defines the visual design system.
  Location: specs/main/design/visual-design.md
  
  ACTION REQUIRED: Fill in all placeholders marked with {placeholder}.
  All design values MUST use DesignTokens - NO hardcoded values allowed.
-->

## 1. 颜色系统 (Color System)

### 主色调 (Primary Colors)

**主要颜色 (Primary)**
- **用途**: {用途描述}
- **定义**: `DesignTokens.Colors.primary`
- **示例值**: 
  - Light Mode: {颜色值}
  - Dark Mode: {颜色值}

**次要颜色 (Secondary)**
- **用途**: {用途描述}
- **定义**: `DesignTokens.Colors.secondary`
- **示例值**:
  - Light Mode: {颜色值}
  - Dark Mode: {颜色值}

### 语义颜色 (Semantic Colors)

**成功 (Success)**
- **用途**: {用途}
- **定义**: `DesignTokens.Colors.success`
- **示例值**: {颜色值}

**警告 (Warning)**
- **用途**: {用途}
- **定义**: `DesignTokens.Colors.warning`
- **示例值**: {颜色值}

**错误 (Error)**
- **用途**: {用途}
- **定义**: `DesignTokens.Colors.error`
- **示例值**: {颜色值}

### 中性色 (Neutral Colors)

**背景色 (Background)**
- **主背景**: `DesignTokens.Colors.background.primary` - {示例值}
- **次要背景**: `DesignTokens.Colors.background.secondary` - {示例值}

**文本色 (Text)**
- **主要文本**: `DesignTokens.Colors.text.primary` - {示例值}
- **次要文本**: `DesignTokens.Colors.text.secondary` - {示例值}
- **禁用文本**: `DesignTokens.Colors.text.disabled` - {示例值}

## 2. 字体系统 (Typography)

### 字体家族
- **默认字体**: `DesignTokens.Typography.fontFamily` - {字体名称}

### 字体大小层级

| 层级 | Token | 大小 | 用途 | 行高 |
|------|-------|------|------|------|
| 标题1 | `DesignTokens.Typography.title1` | {size} | {usage} | {lineHeight} |
| 标题2 | `DesignTokens.Typography.title2` | {size} | {usage} | {lineHeight} |
| 标题3 | `DesignTokens.Typography.title3` | {size} | {usage} | {lineHeight} |
| 正文 | `DesignTokens.Typography.body` | {size} | {usage} | {lineHeight} |
| 辅助文本 | `DesignTokens.Typography.caption` | {size} | {usage} | {lineHeight} |

### 字重 (Font Weight)

| 字重 | Token | 值 | 用途 |
|------|-------|-----|------|
| 常规 | `DesignTokens.Typography.regular` | {value} | {usage} |
| 中等 | `DesignTokens.Typography.medium` | {value} | {usage} |
| 粗体 | `DesignTokens.Typography.bold` | {value} | {usage} |

## 3. 间距系统 (Spacing)

### 间距层级

| 层级 | Token | 值 | 用途 |
|------|-------|-----|------|
| 极小 | `DesignTokens.Spacing.xs` | {value}pt | {usage} |
| 小 | `DesignTokens.Spacing.sm` | {value}pt | {usage} |
| 中等 | `DesignTokens.Spacing.md` | {value}pt | {usage} |
| 大 | `DesignTokens.Spacing.lg` | {value}pt | {usage} |
| 特大 | `DesignTokens.Spacing.xl` | {value}pt | {usage} |

### 间距使用规范

**组件内间距**:
- {规范1}
- {规范2}

**组件间间距**:
- {规范1}
- {规范2}

**页面边距**:
- {规范1}
- {规范2}

## 4. 圆角系统 (Corner Radius)

| 层级 | Token | 值 | 用途 |
|------|-------|-----|------|
| 小 | `DesignTokens.CornerRadius.small` | {value}pt | {usage} |
| 中 | `DesignTokens.CornerRadius.medium` | {value}pt | {usage} |
| 大 | `DesignTokens.CornerRadius.large` | {value}pt | {usage} |

## 5. 阴影系统 (Shadows)

| 层级 | Token | 参数 | 用途 |
|------|-------|------|------|
| 轻 | `DesignTokens.Shadows.light` | {params} | {usage} |
| 中 | `DesignTokens.Shadows.medium` | {params} | {usage} |
| 重 | `DesignTokens.Shadows.heavy` | {params} | {usage} |

## 6. 图标系统 (Icons)

### 图标尺寸

| 尺寸 | Token | 值 | 用途 |
|------|-------|-----|------|
| 小 | `DesignTokens.Icons.small` | {value}pt | {usage} |
| 中 | `DesignTokens.Icons.medium` | {value}pt | {usage} |
| 大 | `DesignTokens.Icons.large` | {value}pt | {usage} |

### 图标风格
- **风格**: {描述}
- **来源**: {SF Symbols/自定义/...}

## 7. 动画系统 (Animation)

### 动画时长

| 类型 | Token | 值 | 用途 |
|------|-------|-----|------|
| 快速 | `DesignTokens.Animation.fast` | {value}s | {usage} |
| 标准 | `DesignTokens.Animation.standard` | {value}s | {usage} |
| 慢速 | `DesignTokens.Animation.slow` | {value}s | {usage} |

### 缓动函数 (Easing)

| 类型 | Token | 值 | 用途 |
|------|-------|-----|------|
| 线性 | `DesignTokens.Animation.linear` | {value} | {usage} |
| 缓入缓出 | `DesignTokens.Animation.easeInOut` | {value} | {usage} |

