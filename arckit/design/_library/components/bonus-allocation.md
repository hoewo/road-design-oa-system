# 奖金分配 (Bonus Allocation)

**Feature**: 道路设计公司项目管理系统  
**Created**: 2025-12-27  
**Platform**: Web（基于 Ant Design）

<!--
  This file defines the Bonus Allocation component specification.
  Location: specs/main/design/components/bonus-allocation.md
  
  This is a reusable component for both business bonus and production bonus allocation.
  All components are based on Ant Design component library with custom styling.
-->

## 组件信息
- **组件名称**: 奖金分配
- **组件标识**: `BonusAllocation` (复合组件)
- **分类**: 复合组件
- **复杂度**: 中等

## 组件概述

**用途**: 用于项目奖金分配管理，支持经营奖金和生产奖金两种类型。提供统一的交互模式，包括列表展示、添加、编辑、删除功能。

**使用场景**:
- 经营奖金分配：经营负责人为项目经营相关人员分配经营奖金
- 生产奖金分配：生产负责人为项目生产相关人员分配生产奖金

**依赖组件**:
- Card (components/card.md) - 卡片容器
- Table (components/table.md) - 数据表格
- Modal (components/modal.md) - 模态框
- Button (components/button.md) - 按钮
- Statistic (components/statistic.md) - 统计数值（可选，用于生产奖金分配）

## 视觉规范

### 基础样式

**容器**:
- 使用 Card 组件作为容器
- 标题区域显示"经营奖金分配"或"生产奖金分配"
- 标题右侧显示"分配奖金"按钮（有权限时）

**统计信息** (仅生产奖金分配):
- 使用横排布局，三个统计卡片并排显示
- 统计卡片：总发放金额、发放次数、发放人数
- 卡片间距：20px
- 卡片样式：白色背景，灰色边框，圆角 4px

**表格**:
- 列定义：
  - 发放时间（第一列）
  - 发放人员（第二列）
  - 奖金金额（第三列）
  - 操作（第四列，有权限时显示）
- 表格支持分页：每页 10 条，可调整每页数量
- 表格底部显示总记录数

**按钮**:
- "分配奖金"按钮：主要按钮样式，小尺寸，带加号图标
- "编辑"按钮：链接样式，带编辑图标
- "删除"按钮：链接样式，危险色，带删除图标

### 颜色

**统计卡片**:
- 背景色：白色 (#ffffff)
- 边框色：灰色 (#ccc)
- 标签文字：灰色 (#666)
- 数值文字：深灰色 (#333)

**表格**:
- 表头背景：浅灰色 (#f0f0f0)
- 表格边框：灰色 (#ccc)
- 链接文字：蓝色

## 状态定义

### 1. 加载中 (Loading)
- **触发条件**: 数据加载中
- **视觉**: 表格显示加载动画（Spin）
- **交互**: 禁用所有操作按钮

### 2. 正常显示 (Normal)
- **触发条件**: 数据加载成功，有数据
- **视觉**: 显示统计信息（生产奖金分配）和奖金记录表格
- **交互**: 可点击"分配奖金"添加记录，可点击"编辑"/"删除"操作记录

### 3. 空状态 (Empty)
- **触发条件**: 数据加载成功，无数据
- **视觉**: 显示空状态提示（可选图标 + 提示文字）
- **交互**: 可点击"分配奖金"添加第一条记录

### 4. 错误状态 (Error)
- **触发条件**: 数据加载失败
- **视觉**: 显示错误提示信息和"重试"按钮
- **交互**: 可点击"重试"重新加载数据

### 5. 添加模式 (Add Mode)
- **触发条件**: 点击"分配奖金"按钮
- **视觉**: 打开模态框，显示奖金分配表单
- **交互**: 可填写表单并提交，可取消关闭模态框

### 6. 编辑模式 (Edit Mode)
- **触发条件**: 点击"编辑"按钮
- **视觉**: 打开模态框，表单预填充现有数据
- **交互**: 可修改表单并提交，可取消关闭模态框

### 7. 删除确认 (Delete Confirm)
- **触发条件**: 点击"删除"按钮
- **视觉**: 显示确认对话框（Popconfirm）
- **交互**: 可确认删除或取消

### 8. 表单验证错误 (Validation Error)
- **触发条件**: 表单提交时验证失败
- **视觉**: 错误字段显示红色边框，下方显示错误提示
- **交互**: 修正错误后可重新提交

### 9. 保存成功 (Success)
- **触发条件**: 添加/编辑记录保存成功
- **视觉**: 显示成功提示消息（message.success），关闭模态框，刷新列表
- **交互**: 列表自动更新，新添加的记录可高亮显示（可选）

## 属性规范

### 必需属性
- `projectId`: string - 项目ID
- `bonusType`: 'business' | 'production' - 奖金类型

### 可选属性
- `showStatistics`: boolean = false - 是否显示统计信息（默认仅生产奖金分配显示）
- `onRefresh`: () => void - 刷新回调（可选）

## 表单字段规范

### 发放人员 (recipient_id)
- **类型**: Select（下拉选择）
- **必填**: 是
- **数据源**: 
  - 经营奖金：所有可用用户（getAvailableUsersForMember）
  - 生产奖金：项目生产人员列表（设计人、参与人、复核人等）
- **显示格式**: 真实姓名 (用户名)，如"张三 (zhangsan)"
- **支持搜索**: 是

### 发放时间 (occurred_at)
- **类型**: DatePicker（日期选择器）
- **必填**: 是
- **默认值**: 当前日期
- **格式**: YYYY-MM-DD

### 奖金金额 (amount)
- **类型**: InputNumber（数字输入）
- **必填**: 是
- **前缀**: ¥
- **精度**: 2位小数
- **最小值**: 0.01
- **验证规则**: 必须大于0

### 备注 (description)
- **类型**: TextArea（多行文本）
- **必填**: 否
- **行数**: 3行
- **占位符**: "请输入备注信息（可选）"

## 交互行为

### 列表操作
- **添加**: 点击"分配奖金"按钮 → 打开添加模态框 → 填写表单 → 提交 → 刷新列表
- **编辑**: 点击"编辑"链接 → 打开编辑模态框（预填充数据）→ 修改表单 → 提交 → 刷新列表
- **删除**: 点击"删除"链接 → 显示确认对话框 → 确认 → 删除记录 → 刷新列表

### 权限控制
- **有权限**（经营负责人/生产负责人/项目管理员）:
  - 显示"分配奖金"按钮
  - 显示"编辑"和"删除"操作列
  - 可操作表单
- **无权限**:
  - 隐藏"分配奖金"按钮
  - 隐藏"编辑"和"删除"操作列
  - 表单只读（查看模式）

### 数据刷新
- 添加/编辑/删除成功后自动刷新列表
- 使用 React Query 的 invalidateQueries 机制

## 无障碍支持

### 语义化
- 表格使用语义化 HTML 结构
- 按钮提供清晰的标签和图标
- 表单字段提供标签和必填标识

### 键盘导航
- 支持 Tab 键在表单字段间导航
- 支持 Enter 键提交表单
- 支持 Esc 键关闭模态框

### 屏幕阅读器
- 表格提供适当的 ARIA 标签
- 按钮提供 accessibility label
- 表单字段提供关联的 label

## 使用示例

### 经营奖金分配
```tsx
<BonusAllocation
  projectId={projectId}
  bonusType="business"
  showStatistics={false}
/>
```

### 生产奖金分配
```tsx
<BonusAllocation
  projectId={projectId}
  bonusType="production"
  showStatistics={true}
/>
```

## 设计注意事项

### 统一性
- 经营奖金分配和生产奖金分配使用相同的交互模式
- 表单字段和验证规则保持一致
- 错误处理和成功提示统一

### 可复用性
- 组件支持两种奖金类型（business/production）
- 统计信息可选显示（仅生产奖金分配需要）
- 权限检查内置在组件内部

### 用户体验
- 加载状态提供明确的视觉反馈
- 空状态提供友好的引导提示
- 删除操作需要二次确认，防止误操作
- 表单验证提供清晰的错误提示

## 实现注意事项

### 技术栈
- 使用 Ant Design 组件库（Card, Table, Modal, Button, Form, Select, DatePicker, InputNumber, TextArea）
- 使用 React Query 进行数据管理
- 使用权限服务检查用户权限

### 数据流
- 通过 React Query 的 useQuery 获取奖金记录列表
- 通过 useMutation 处理添加/编辑/删除操作
- 操作成功后使用 invalidateQueries 刷新数据

### 权限集成
- 使用 permissionService.canManageBusinessInfo（经营奖金）
- 使用 permissionService.canManageProductionInfo（生产奖金）
- 权限检查结果控制 UI 显示和交互

### 统计计算
- 总发放金额：所有记录金额之和
- 发放次数：记录总数
- 发放人数：去重后的发放人员数量

## 组件拆分建议

为了更好的可维护性，建议将组件拆分为：

1. **BonusAllocationList** - 主组件，包含列表和统计
2. **BonusAllocationForm** - 表单组件（添加/编辑共用）
3. **BonusAllocationStatistics** - 统计信息组件（可选）
4. **BonusAllocationTable** - 表格组件（可选）

## 版本历史

- **v1.0.0** (2025-12-27): 初始版本，统一经营奖金和生产奖金分配交互

**最后更新**: 2025-12-27

