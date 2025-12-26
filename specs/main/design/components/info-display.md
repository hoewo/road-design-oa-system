# 信息展示区域 (InfoDisplay)

**Feature**: 道路设计公司项目管理系统  
**Created**: 2025-12-25  
**Platform**: Web（基于 Ant Design）

<!--
  This file defines the InfoDisplay component specification.
  Location: specs/main/design/components/info-display.md
  
  All components are based on Ant Design component library with custom styling.
-->

## 组件信息
- **组件名称**: 信息展示区域
- **组件标识**: 自定义组件（基于 div）
- **分类**: 复合组件

## 用途说明
用于展示只读信息，如甲方名称、联系人、联系电话等。提供清晰的视觉层次。

## 视觉规范

**尺寸**:
- **宽度**: 100% 父容器宽度（Col span={8}）
- **内边距**: `10px`
- **外边距**: `marginBottom: 16px`

**颜色**:
- **背景色**: `#f9f9f9`
- **边框**: `2px solid #e0e0e0`
- **文字颜色**: 默认文本颜色

**字体**:
- **标签**: `fontWeight: 'bold'`, `marginBottom: 8px`
- **内容**: 默认字体

**圆角**:
- `borderRadius: '4px'`

## 状态定义

**正常状态 (Normal)**:
- **外观**: 灰色背景，灰色边框
- **交互**: 无交互，只读显示

## 属性规范

| 属性名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| label | string | 是 | - | 标签文本 |
| value | string | 是 | - | 显示值 |
| span | number | 否 | 8 | Col 组件 span 值 |

## 交互行为

**无交互**:
- 纯展示组件，不支持编辑
- 无点击、悬停等交互

## 无障碍支持

**语义化**:
- 使用 label 和 value 语义化结构
- 提供清晰的标签文本

## 使用示例

**基本用法**:
```tsx
<Col span={8}>
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
      甲方名称
    </div>
    <div
      style={{
        padding: '10px',
        border: '2px solid #e0e0e0',
        background: '#f9f9f9',
        borderRadius: '4px',
      }}
    >
      {clientName || '-'}
    </div>
  </div>
</Col>
```

## 设计注意事项
- 统一使用 `2px solid #e0e0e0` 边框
- 统一使用 `#f9f9f9` 背景色
- 标签使用粗体，与内容区分

## 实现注意事项
- 使用内联样式实现
- 空值显示 `-`
- 建议封装为可复用组件

