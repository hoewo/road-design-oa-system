# 按钮 (Button)

**Feature**: 道路设计公司项目管理系统  
**Created**: 2025-12-25  
**Platform**: Web（基于 Ant Design）

<!--
  This file defines the Button component specification.
  Location: specs/main/design/components/button.md
  
  All components are based on Ant Design component library with custom styling.
-->

## 组件信息
- **组件名称**: 按钮
- **组件标识**: `Button` (Ant Design)
- **分类**: 基础组件

## 用途说明
用于触发操作，包括主要操作、次要操作、危险操作等。

## 视觉规范

**尺寸**:
- **小**: `size="small"` - 卡片 extra 区域按钮
- **中**: 默认尺寸 - 标准按钮
- **大**: `size="large"` - 重要操作按钮

**颜色**:
- **主要按钮**: `type="primary"` - 蓝色背景 (#1890ff)
- **链接按钮**: `type="link"` - 蓝色文字，无背景
- **危险按钮**: `type="link" danger` - 红色文字 (#ff4d4f)
- **默认按钮**: 默认样式

**字体**:
- **按钮文字**: 默认字体大小
- **图标**: 使用 Ant Design Icons

**圆角**:
- 默认 Ant Design 圆角

## 状态定义

**正常状态 (Normal)**:
- **外观**: 标准按钮样式
- **交互**: 鼠标悬停时背景色变化

**悬停状态 (Hover)**:
- **外观**: 背景色加深或文字颜色变化
- **交互**: 光标变为手型

**按下状态 (Pressed)**:
- **外观**: 背景色进一步加深
- **交互**: 点击反馈

**禁用状态 (Disabled)**:
- **外观**: 灰色背景，文字颜色变淡
- **交互**: 不可点击

**加载状态 (Loading)**:
- **外观**: 显示加载图标
- **交互**: 不可点击，显示 `confirmLoading` 或 `loading` 属性

## 属性规范

| 属性名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| type | string | 否 | default | primary/link/text/default |
| size | string | 否 | middle | small/middle/large |
| danger | boolean | 否 | false | 危险操作按钮 |
| icon | ReactNode | 否 | - | 按钮图标 |
| loading | boolean | 否 | false | 加载状态 |
| onClick | function | 否 | - | 点击事件 |

## 交互行为

**点击**:
- 触发 onClick 事件
- 执行对应操作
- 显示反馈消息

**键盘导航**:
- Tab 键可聚焦
- Enter 键触发点击

## 无障碍支持

**语义化**:
- 使用 button 元素
- 提供清晰的按钮文本

**键盘导航**:
- 支持 Tab 键聚焦
- 支持 Enter/Space 键触发

## 使用示例

**基本用法**:
```tsx
<Button type="primary" onClick={handleClick}>
  添加
</Button>
```

**带图标按钮**:
```tsx
<Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
  添加参与人
</Button>
```

**链接样式按钮**:
```tsx
<Button type="link" danger icon={<DeleteOutlined />} onClick={handleDelete}>
  删除
</Button>
```

## 设计注意事项
- 主要操作使用 `type="primary"`
- 次要操作使用 `type="link"`
- 危险操作使用 `danger` 属性
- 卡片 extra 区域使用 `size="small"`

## 实现注意事项
- 使用 Ant Design Button 组件
- 权限控制：无权限时完全隐藏按钮，不显示禁用状态

