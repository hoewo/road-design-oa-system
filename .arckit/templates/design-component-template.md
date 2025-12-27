---
description: "Component specification template"
---

# {组件名称} 组件规范

**组件标识**: `{ComponentIdentifier}`  
**类型**: {基础组件/复合组件/页面组件}  
**复杂度**: {简单/中等/复杂}  
**最后更新**: [DATE]

---

## 组件概述

**用途**: {简短描述组件的用途和使用场景}

**使用场景**:
- {场景 1}
- {场景 2}
- {场景 3}

**依赖组件**:
<!-- ACTION REQUIRED: 列举依赖的其他组件，使用结构化格式，如无依赖则写"无" -->
- {ComponentName} (components/{component-name}.md)
- {ComponentName} (components/{component-name}.md)
<!-- 或者写"无"如果没有依赖 -->

---

## 视觉规范

### 基础样式

**尺寸**:
- 高度: `DesignTokens.{Category}.{property}`
- 最小宽度: `DesignTokens.{Category}.{property}`
- 内边距: 
  - 水平: `DesignTokens.Spacing.{size}`
  - 垂直: `DesignTokens.Spacing.{size}`

**颜色**:
- 背景色: `DesignTokens.Colors.{name}`
- 文本色: `DesignTokens.Colors.{name}`
- 边框色: `DesignTokens.Colors.{name}` (如适用)

**字体**:
- 字体大小: `DesignTokens.Typography.{level}`
- 字重: `DesignTokens.Typography.{weight}`

**圆角**:
- 圆角半径: `DesignTokens.CornerRadius.{size}`

**阴影** (如适用):
- 阴影: `DesignTokens.Shadows.{level}`

**边框** (如适用):
- 宽度: `{值}pt`
- 样式: {实线/虚线/无}

---

## 状态定义

### 1. Normal (正常)
- **触发条件**: 默认状态
- **视觉**: 背景色 `DesignTokens.Colors.{name}`, 透明度 1.0
- **交互**: 可点击/可输入
- **无障碍**: {描述 VoiceOver 行为}

### 2. Hover (悬停) - 仅 macOS
- **触发条件**: 鼠标悬停
- **视觉**: 背景色 `DesignTokens.Colors.{name}Hover`, 光标 pointer
- **动画**: 颜色过渡 `DesignTokens.Animations.fast`

### 3. Pressed (按下)
- **触发条件**: 用户点击/触摸
- **视觉**: 背景色 `DesignTokens.Colors.{name}Pressed`, 缩放 0.95, 透明度 0.8
- **动画**: 时长 `DesignTokens.Animations.fast`, 缓动 ease-in-out
- **反馈**: iOS 触觉反馈, macOS 无

### 4. Disabled (禁用)
- **触发条件**: 组件被禁用
- **视觉**: 不透明度 0.4, 背景色 `DesignTokens.Colors.disabled`, 文本色 `DesignTokens.Colors.textDisabled`
- **交互**: 不可交互
- **无障碍**: Trait `.isDisabled`

### 5. Selected (选中) - 如适用
- **触发条件**: 组件被选中
- **视觉**: 背景色 `DesignTokens.Colors.{name}Selected`, 边框 {描述}
- **交互**: 可再次点击取消选中
- **无障碍**: Trait `.isSelected`

### 6. Focus (聚焦) - 如适用
- **触发条件**: 键盘焦点
- **视觉**: 边框 `DesignTokens.Colors.focus`, 宽度 2pt
- **交互**: 接收键盘输入
- **无障碍**: VoiceOver 聚焦

### 7. {其他状态} - 如适用
- **触发条件**: {描述}
- **视觉**: {描述}
- **交互**: {描述}

---

## 属性规范

### 必需属性
- `title`: String - {描述}
- `action`: () -> Void - {描述}

### 可选属性
- `isEnabled`: Bool = true - 是否启用
- `style`: {Type} = .default - 样式变体
- `icon`: Image? = nil - 可选图标

### 样式变体
- **primary**: 主要操作 ({描述外观})
- **secondary**: 次要操作 ({描述外观})
- **destructive**: 危险操作 ({描述外观})

---

## 交互行为

### iOS 平台
- **点击**: {描述}, 触觉反馈, 视觉反馈, 执行 action
- **长按** (如适用): 触发条件 0.5s, {描述行为}
- **滑动** (如适用): 方向 {描述}, {描述行为}

### macOS 平台
- **点击**: {描述}, 视觉反馈, 执行 action
- **右键** (如适用): {列举菜单项}
- **键盘** (如适用): Return/Enter 触发, Space 切换, Tab 移动焦点

---

## 无障碍支持

### VoiceOver
- **Label**: `{描述 accessibility label}`
- **Hint**: `{描述 accessibility hint}`
- **Traits**: `{如 .button, .staticText}`
- **Value** (如适用): `{描述 accessibility value}`

### Dynamic Type
- 支持动态字体大小调整
- 文本不截断，容器自适应
- 最小/最大字体: {值}pt

### 色彩对比度
- 文本与背景对比度: {值}:1 (符合 WCAG AA)
- Dark Mode 下符合对比度要求

### 键盘导航
- 支持 Tab 键导航
- 聚焦时明确视觉指示
- 支持快捷键 (macOS)

---

## 实现要点

**关键规则**:
- 所有设计值从 DesignTokens 读取
- 实现所有状态 (至少 Normal, Pressed, Disabled)
- 支持 VoiceOver 和 Dynamic Type
- 平台差异处理 (iOS vs macOS)

**测试要点**:
- 所有状态正确显示
- 动画流畅无卡顿
- VoiceOver 正确朗读
- 键盘导航正常 (macOS)

---

**版本**: 1.0.0  
**最后更新**: [DATE]
