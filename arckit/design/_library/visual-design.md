# 视觉设计规范

**Feature**: 道路设计公司项目管理系统  
**Created**: 2025-12-25  
**Platform**: Web（基于 Ant Design）

<!--
  This file defines the visual design system.
  Location: specs/main/design/specifications/visual-design.md
  
  All design values are extracted from the current business information frontend code.
-->

## 1. 颜色系统 (Color System)

### 主色调 (Primary Colors)

**主要颜色 (Primary)**
- **用途**: 主要操作按钮、链接、重要信息高亮
- **定义**: `#1890ff`
- **使用场景**: 
  - 统计数值显示（总应收金额）
  - 可点击链接
  - 主要操作按钮

**次要颜色 (Secondary)**
- **用途**: 次要信息、辅助操作
- **定义**: `#666`
- **使用场景**: 
  - 次要文本
  - 辅助信息显示

### 语义颜色 (Semantic Colors)

**成功 (Success)**
- **用途**: 成功状态、正向数值、已完成操作
- **定义**: `#52c41a`
- **使用场景**: 
  - 已收金额统计
  - 正向财务数值
  - 成功提示消息

**警告 (Warning)**
- **用途**: 警告信息、需要注意的状态
- **定义**: `#ff4d4f`（与错误共用，通过上下文区分）
- **使用场景**: 
  - 警告提示
  - 需要关注的信息

**错误 (Error)**
- **用途**: 错误状态、负向数值、失败操作
- **定义**: `#ff4d4f`
- **使用场景**: 
  - 未收金额统计
  - 错误提示消息
  - 删除操作按钮
  - 表单验证错误

### 中性色 (Neutral Colors)

**背景色 (Background)**
- **主背景**: `#fff` - 页面主背景、卡片背景
- **次要背景**: `#fafafa` - 信息展示区域背景（推荐，更柔和）
- **三级背景**: `#f5f5f5` - 嵌套内容背景、轻量级信息展示
- **四级背景**: `#f9f9f9` - 输入框背景、强调型信息展示（较深，谨慎使用）
- **页面背景**: `#f0f2f5` - 登录页面背景
- **悬停背景**: `#fafafa` - 列表项悬停背景

**文本色 (Text)**
- **主要文本**: `#262626` - 标题、重要文本
- **次要文本**: `#666` - 描述性文本、辅助信息
- **辅助文本**: `#999` - 提示文本、占位符文本
- **禁用文本**: `#ccc` - 禁用状态的文本

**边框色 (Border)**
- **主要边框**: `#e8e8e8` - 卡片边框、输入框边框（1px solid，推荐用于现代风格）
- **次要边框**: `#d9d9d9` - 分割线、虚线边框
- **三级边框**: `#e0e0e0` - 弱化边框（2px solid，仅用于需要强调的线框图风格，不推荐）
- **分割线**: `#f0f0f0` - 内容分割线（1px solid）
- **柔和边框**: `#f5f5f5` - 极轻边框，用于内容区域分隔

## 2. 字体系统 (Typography)

### 字体家族
- **默认字体**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif`
- **等宽字体**: `source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace`

### 字体大小层级

| 层级 | 大小 | 用途 | 示例 |
|------|------|------|------|
| 标题1 | 20px | 页面标题、卡片标题 | 项目管理OA系统 |
| 标题2 | 16px | 区块标题、表单标题 | 甲方信息 |
| 正文 | 14px（默认） | 正文内容、表单输入 | 默认文本 |
| 辅助文本 | 12px | 提示信息、时间戳、统计说明 | 统计时间范围 |

### 字重 (Font Weight)

| 字重 | 值 | 用途 |
|------|-----|------|
| 常规 | normal (400) | 正文内容 |
| 粗体 | bold (700) | 标题、重要信息、标签文本 |

## 3. 间距系统 (Spacing)

### 间距层级

| 层级 | 值 | 用途 |
|------|-----|------|
| 极小 | 4px | 图标与文字间距、紧密元素间距 |
| 小 | 8px | 表单项间距、小元素间距 |
| 中小 | 10px | 输入框内边距、内容区域边距 |
| 中 | 12px | 辅助文本间距 |
| 中大 | 15px | 内容块内边距 |
| 标准 | 16px | 标准内容间距、卡片内边距 |
| 大 | 20px | 区块间距、大元素间距 |
| 特大 | 24px | 页面边距、卡片间距、主要区块间距 |
| 超大 | 32px | 大区块间距、内容分割间距 |
| 极大 | 60px | 空状态垂直间距 |

### 间距使用规范

**组件内间距**:
- 输入框内边距: `10px`
- 卡片内边距: `16px`
- 表单字段间距: `16px`

**组件间间距**:
- 卡片间距: `24px`
- 区块间距: `24px`
- 列表项间距: `16px`

**页面边距**:
- 页面内容边距: `24px`
- Header 内边距: `0 24px`

## 4. 圆角系统 (Corner Radius)

| 层级 | 值 | 用途 |
|------|-----|------|
| 小 | 4px | 输入框、按钮、卡片、信息展示区域 |

## 5. 阴影系统 (Shadows)

| 层级 | 参数 | 用途 |
|------|------|------|
| 无阴影 | `none` | 默认状态，不添加阴影 |
| 轻量级 | `0 1px 2px rgba(0,0,0,0.04)` | 列表项、文件项、轻量级卡片 |
| 标准 | `0 2px 8px rgba(0,0,0,0.08)` | 卡片、模态框、标准层级 |
| 强调 | `0 4px 12px rgba(0,0,0,0.12)` | 重要卡片、浮层、强调层级 |
| Header | `0 2px 8px rgba(0,0,0,0.1)` | Header 阴影（保持现有样式） |

### 阴影使用规范
- **信息展示区域**: 推荐使用轻量级阴影或无阴影 + 柔和边框
- **文件列表项**: 使用轻量级阴影，提升层次感
- **卡片嵌套**: 外层使用标准阴影，内层使用轻量级阴影或无阴影

## 6. 图标系统 (Icons)

### 图标尺寸
- **小**: 16px - 表格操作、内联图标
- **中**: 20px - 按钮图标、列表图标
- **大**: 24px - 页面级图标

### 图标风格
- **来源**: Ant Design Icons
- **风格**: 线性图标，统一粗细
- **颜色**: 跟随文本颜色或使用语义颜色

## 7. 动画系统 (Animation)

### 动画时长
- **快速**: 0.2s - 悬停效果、快速反馈
- **标准**: 0.3s - 页面转场、模态框显示
- **慢速**: 0.5s - 复杂动画、加载动画

### 缓动函数 (Easing)
- **标准**: `ease-in-out` - 默认动画缓动
- **线性**: `linear` - 加载动画

## 8. 特殊样式模式

### 信息展示区域（推荐：现代风格）

**轻量级信息展示**（推荐用于：批复金额、审计金额、评分等）
- **边框**: `1px solid #e8e8e8`
- **背景**: `#fafafa`
- **内边距**: `12px 16px`
- **圆角**: `6px`
- **阴影**: `0 1px 2px rgba(0,0,0,0.04)` 或 `none`
- **用途**: 金额展示、评分展示、轻量级信息展示
- **视觉特点**: 柔和、现代、不突兀

**标准信息展示**（推荐用于：文件列表项、内容区块）
- **边框**: `1px solid #e8e8e8`
- **背景**: `#fff`
- **内边距**: `12px 16px`
- **圆角**: `6px`
- **阴影**: `0 1px 2px rgba(0,0,0,0.04)`
- **悬停效果**: `background: #fafafa`, `box-shadow: 0 2px 4px rgba(0,0,0,0.06)`
- **用途**: 文件列表项、可交互内容区块
- **视觉特点**: 清晰、有层次、可交互

**强调型信息展示**（用于：重要信息、需要突出的内容）
- **边框**: `1px solid #d9d9d9`
- **背景**: `#f9f9f9`
- **内边距**: `12px 16px`
- **圆角**: `6px`
- **阴影**: `0 2px 4px rgba(0,0,0,0.06)`
- **用途**: 重要信息展示、需要强调的内容
- **视觉特点**: 突出、有存在感

**传统线框图风格**（不推荐，仅用于向后兼容）
- **边框**: `2px solid #e0e0e0`
- **背景**: `#f9f9f9`
- **内边距**: `10px`
- **圆角**: `4px`
- **阴影**: `none`
- **用途**: 仅用于需要保持旧版视觉风格的场景
- **视觉特点**: 粗边框、高对比、线框图感

### 文件列表项样式（推荐）

**现代文件列表项**
- **边框**: `1px solid #e8e8e8`
- **背景**: `#fff`
- **内边距**: `12px 16px`
- **圆角**: `6px`
- **阴影**: `0 1px 2px rgba(0,0,0,0.04)`
- **间距**: `margin: 8px 0`
- **悬停效果**: 
  - `background: #fafafa`
  - `box-shadow: 0 2px 4px rgba(0,0,0,0.06)`
  - `border-color: #d9d9d9`
- **过渡动画**: `transition: all 0.2s ease-in-out`
- **用途**: 文件列表、文档列表、可交互列表项

### 内容区块样式（推荐）

**嵌套内容区块**（用于：方案阶段、批复审计等模块的内容区域）
- **边框**: `1px solid #f0f0f0`
- **背景**: `#fafafa`
- **内边距**: `16px`
- **圆角**: `8px`
- **阴影**: `none` 或 `0 1px 2px rgba(0,0,0,0.04)`
- **间距**: `margin: 16px 0`
- **用途**: 方案文件区域、批复金额区域、审计金额区域等
- **视觉特点**: 柔和、有层次、不抢夺注意力

### 统计数值样式
- **总应收金额**: `color: #1890ff`（蓝色）
- **已收金额**: `color: #52c41a`（绿色）
- **未收金额**: `color: #ff4d4f`（红色）

### 表格样式
- **表头**: 默认 Ant Design 样式
- **行间距**: 默认
- **操作列**: 链接样式按钮

### 模态框样式
- **宽度**: 800px（表单模态框）、500px（简单模态框）、600px（中等模态框）
- **内边距**: 默认 Ant Design 样式

## 9. 设计 Token 映射（未来实现）

当前系统使用硬编码颜色值，未来应迁移到 DesignTokens：

```typescript
// 未来实现
DesignTokens.Colors.primary = '#1890ff'
DesignTokens.Colors.success = '#52c41a'
DesignTokens.Colors.error = '#ff4d4f'
DesignTokens.Colors.text.primary = '#262626'
DesignTokens.Colors.text.secondary = '#666'
DesignTokens.Colors.text.tertiary = '#999'
DesignTokens.Colors.border.primary = '#e8e8e8'  // 更新：使用更柔和的边框色
DesignTokens.Colors.border.secondary = '#f0f0f0'  // 新增：柔和边框
DesignTokens.Colors.background.secondary = '#fafafa'  // 更新：使用更柔和的背景
DesignTokens.Colors.background.tertiary = '#f5f5f5'  // 新增：三级背景
DesignTokens.Spacing.md = '24px'
DesignTokens.Spacing.sm = '16px'
DesignTokens.Spacing.xs = '8px'
DesignTokens.CornerRadius.small = '6px'  // 更新：从 4px 到 6px
DesignTokens.CornerRadius.medium = '8px'  // 新增：中等圆角
DesignTokens.Shadows.light = '0 1px 2px rgba(0,0,0,0.04)'  // 新增：轻量级阴影
DesignTokens.Shadows.standard = '0 2px 8px rgba(0,0,0,0.08)'  // 更新：标准阴影
DesignTokens.Typography.title1 = '20px'
DesignTokens.Typography.caption = '12px'
```

