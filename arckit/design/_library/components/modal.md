# 模态框 (Modal)

**Feature**: 道路设计公司项目管理系统  
**Created**: 2025-12-25  
**Platform**: Web（基于 Ant Design）

<!--
  This file defines the Modal component specification.
  Location: specs/main/design/components/modal.md
  
  All components are based on Ant Design component library with custom styling.
-->

## 组件信息
- **组件名称**: 模态框
- **组件标识**: `Modal` (Ant Design)
- **分类**: 复合组件

## 用途说明
用于显示表单、详情等弹窗内容。

## 视觉规范

**尺寸**:
- **表单模态框**: `width={800}`
- **简单模态框**: `width={500}`
- **中等模态框**: `width={600}`

**颜色**:
- **背景**: 半透明遮罩
- **内容区**: 白色背景

**字体**:
- **标题**: 模态框标题
- **内容**: 表单或内容区域

## 状态定义

**显示状态 (Visible)**:
- **外观**: 显示模态框和遮罩
- **交互**: 可点击遮罩或取消按钮关闭

**隐藏状态 (Hidden)**:
- **外观**: 不显示
- **交互**: 无交互

## 属性规范

| 属性名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| title | string | 是 | - | 模态框标题 |
| open | boolean | 是 | - | 是否显示 |
| onCancel | function | 是 | - | 关闭回调 |
| width | number | 否 | 520 | 模态框宽度 |
| footer | ReactNode | 否 | - | 底部内容（null 表示无底部） |
| destroyOnClose | boolean | 否 | false | 关闭时销毁内容 |

## 交互行为

**打开**:
- 点击触发按钮打开模态框
- 显示淡入动画

**关闭**:
- 点击取消按钮关闭
- 点击遮罩关闭（如支持）
- 按 Esc 键关闭
- 显示淡出动画

## 无障碍支持

**语义化**:
- 提供清晰的标题
- 支持键盘导航

## 使用示例

**基本用法**:
```tsx
<Modal
  title="添加参与人"
  open={visible}
  onCancel={handleClose}
  footer={null}
  width={500}
>
  内容
</Modal>
```

## 设计注意事项
- 表单模态框使用 `width={800}`
- 简单确认使用 `width={500}`
- 无底部按钮时设置 `footer={null}`

## 实现注意事项
- 使用 Ant Design Modal 组件
- 设置 `destroyOnClose` 确保关闭时重置表单

