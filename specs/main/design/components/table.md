# 表格 (Table)

**Feature**: 道路设计公司项目管理系统  
**Created**: 2025-12-25  
**Platform**: Web（基于 Ant Design）

<!--
  This file defines the Table component specification.
  Location: specs/main/design/components/table.md
  
  All components are based on Ant Design component library with custom styling.
-->

## 组件信息
- **组件名称**: 表格
- **组件标识**: `Table` (Ant Design)
- **分类**: 复合组件

## 用途说明
用于展示列表数据，支持分页、排序、操作等功能。

## 视觉规范

**尺寸**:
- **宽度**: 100% 父容器宽度
- **行高**: 默认 Ant Design 行高

**颜色**:
- **表头**: 默认 Ant Design 表头样式
- **行**: 默认 Ant Design 行样式
- **操作列**: 链接样式按钮

**字体**:
- **表头**: 默认字体
- **内容**: 默认字体

## 状态定义

**正常状态 (Normal)**:
- **外观**: 标准表格样式
- **交互**: 行悬停背景色变化

**加载状态 (Loading)**:
- **外观**: 显示加载动画
- **交互**: 表格内容区域显示 Spin

**空状态 (Empty)**:
- **外观**: 显示"暂无数据"
- **交互**: 无交互

## 属性规范

| 属性名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| columns | array | 是 | - | 表格列定义 |
| dataSource | array | 是 | - | 数据源 |
| rowKey | string | 是 | - | 行唯一标识 |
| loading | boolean | 否 | false | 加载状态 |
| pagination | object | 否 | - | 分页配置 |

## 交互行为

**行悬停**:
- 鼠标悬停时行背景色变化

**操作按钮**:
- 点击操作按钮执行对应操作

**分页**:
- 点击分页器切换页面

## 无障碍支持

**语义化**:
- 使用 table 元素
- 提供清晰的表头

## 使用示例

**基本用法**:
```tsx
<Table
  columns={columns}
  dataSource={data}
  rowKey="id"
  loading={isLoading}
  pagination={{
    pageSize: 10,
    showSizeChanger: true,
    showTotal: (total) => `共 ${total} 条`,
  }}
/>
```

## 设计注意事项
- 操作列使用链接样式按钮
- 分页显示总数
- 支持每页条数调整

## 实现注意事项
- 使用 Ant Design Table 组件
- 权限控制：无权限时隐藏操作列
- 空值显示 `-`

