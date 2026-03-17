# 卡片 (Card)

**Feature**: 道路设计公司项目管理系统  
**Created**: 2025-12-25  
**Platform**: Web（基于 Ant Design）

<!--
  This file defines the Card component specification.
  Location: specs/main/design/components/card.md
  
  All components are based on Ant Design component library with custom styling.
-->

## 组件信息
- **组件名称**: 卡片
- **组件标识**: `Card` (Ant Design)
- **分类**: 复合组件

## 用途说明
用于组织内容，将相关信息分组显示。常用于项目详情页面的各个模块。

## 视觉规范

**尺寸**:
- **宽度**: 100% 父容器宽度
- **内边距**: 默认 Ant Design 内边距
- **外边距**: `marginBottom: 24px`

**颜色**:
- **背景色**: `#fff` (白色)
- **边框**: 默认 Ant Design 边框

**字体**:
- **标题**: 卡片标题使用默认字体
- **内容**: 卡片内容使用默认字体

**阴影**:
- 默认 Ant Design 阴影（如需要）

## 状态定义

**正常状态 (Normal)**:
- **外观**: 标准卡片样式
- **交互**: 无特殊交互

## 属性规范

| 属性名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| title | string | 否 | - | 卡片标题 |
| extra | ReactNode | 否 | - | 右上角操作区域 |
| style | object | 否 | - | 自定义样式 |

## 交互行为

**无直接交互**:
- 卡片本身不提供交互
- 内部组件提供交互功能

## 无障碍支持

**语义化**:
- 使用语义化 HTML 结构
- 标题使用 h3 或 h4 标签

## 使用示例

**基本用法**:
```tsx
<Card title="甲方信息" style={{ marginBottom: 24 }}>
  内容
</Card>
```

**带操作按钮**:
```tsx
<Card
  title="经营参与人"
  extra={
    <Button type="primary" size="small" icon={<PlusOutlined />}>
      添加参与人
    </Button>
  }
>
  内容
</Card>
```

## 设计注意事项
- 卡片间距统一使用 `24px`
- 卡片标题清晰描述内容
- extra 区域放置主要操作按钮

## 实现注意事项
- 使用 Ant Design Card 组件
- 统一设置 `marginBottom: 24px`

