# 统计数值 (Statistic)

**Feature**: 道路设计公司项目管理系统  
**Created**: 2025-12-25  
**Platform**: Web（基于 Ant Design）

<!--
  This file defines the Statistic component specification.
  Location: specs/main/design/components/statistic.md
  
  All components are based on Ant Design component library with custom styling.
-->

## 组件信息
- **组件名称**: 统计数值
- **组件标识**: `Statistic` (Ant Design)
- **分类**: 基础组件

## 用途说明
用于展示统计数据，如总应收金额、已收金额、未收金额等。使用不同颜色区分不同类型的数值。

## 视觉规范

**尺寸**:
- **宽度**: Col span={8}（三个统计项并排）
- **间距**: Row gutter={16}

**颜色**:
- **总应收金额**: `valueStyle={{ color: '#1890ff' }}` (蓝色)
- **已收金额**: `valueStyle={{ color: '#52c41a' }}` (绿色)
- **未收金额**: `valueStyle={{ color: '#ff4d4f' }}` (红色)

**字体**:
- **标题**: 默认字体
- **数值**: 较大字体，使用语义颜色

## 状态定义

**正常状态 (Normal)**:
- **外观**: 显示标题和数值
- **交互**: 无交互

**加载状态 (Loading)**:
- **外观**: 显示加载动画
- **交互**: 数值区域显示 Spin

## 属性规范

| 属性名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| title | string | 是 | - | 统计项标题 |
| value | number | 是 | - | 统计数值 |
| formatter | function | 否 | - | 数值格式化函数 |
| valueStyle | object | 否 | - | 数值样式 |
| loading | boolean | 否 | false | 加载状态 |

## 交互行为

**无直接交互**:
- 纯展示组件
- 支持加载状态显示

## 无障碍支持

**语义化**:
- 提供清晰的标题和数值
- 数值格式化便于阅读

## 使用示例

**基本用法**:
```tsx
<Statistic
  title="总应收金额"
  value={totalReceivable}
  formatter={(value) => formatCurrency(Number(value))}
  valueStyle={{ color: '#1890ff' }}
  loading={isLoading}
/>
```

## 设计注意事项
- 使用语义颜色区分不同类型的数值
- 数值格式化使用货币格式（¥符号，千分位）
- 三个统计项并排显示

## 实现注意事项
- 使用 Ant Design Statistic 组件
- 自定义 formatter 格式化货币
- 使用 valueStyle 设置颜色

