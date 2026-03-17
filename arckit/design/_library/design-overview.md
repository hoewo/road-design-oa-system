# 设计规范总览

**Feature**: 道路设计公司项目管理系统  
**Created**: 2025-12-25  
**Status**: Draft

<!--
  This file is the design specifications overview document.
  Location: specs/main/design/overview.md
-->

## 文档说明

本文档描述了道路设计公司项目管理系统的完整设计规范，包括视觉设计、交互设计、组件规范和状态定义。本规范基于当前经营信息模块的前端代码提取的视觉规范作为整体视觉规范。

## 规范文档列表

### 1. 视觉设计规范 (Visual Design)
- **文件**: `visual-design.md`
- **内容**: 颜色系统、typography、间距、图标、图片处理等

### 2. 交互设计规范 (Interaction Design)
- **文件**: `interaction-design.md`
- **内容**: 交互模式、手势操作、动画效果、反馈机制等

### 3. 组件规范 (Component Specifications)
- **目录**: `components/`
- **内容**: UI组件定义、属性规范、使用场景、状态变化等
- **组件列表**:
  - `button.md` - 按钮组件
  - `card.md` - 卡片组件
  - `info-display.md` - 信息展示区域组件
  - `statistic.md` - 统计数值组件
  - `table.md` - 表格组件
  - `modal.md` - 模态框组件
  - `file-list.md` - 文件列表组件
  - `bonus-allocation.md` - 奖金分配组件（可复用，用于经营奖金和生产奖金）

### 4. 线框图 (Wireframes)
- **目录**: `wireframes/`
- **内容**: 用户界面线框图，包含各个页面的不同状态
- **线框图列表**:
  - `01-login.html` - 登录页面
  - `02-register.html` - 注册页面
  - `03-project-list.html` - 项目列表
  - `04-project-detail-basic.html` - 项目详情-基本信息
  - `05-project-detail-business.html` - 项目详情-经营信息
  - `06-project-detail-production.html` - 项目详情-生产信息
  - `07-company-revenue.html` - 公司营收管理
  - `08-file-management.html` - 文件管理
  - `14-approval-audit-management.html` - 批复审计阶段管理
  - `15-scheme-stage-file-management.html` - 方案阶段文件管理
  - `16-preliminary-design-stage-file-management.html` - 初步设计阶段文件管理
  - `17-construction-drawing-stage-file-management.html` - 施工图设计阶段文件管理
  - `18-change-negotiation-file-management.html` - 变更洽商文件管理
  - `19-completion-acceptance-file-management.html` - 竣工验收文件管理
  - `20-production-cost-management.html` - 生产成本管理
  - `21-external-commission-management.html` - 对外委托管理
  - `22-production-bonus-allocation.html` - 生产奖金分配

### 5. 状态定义 (State Definitions)
- **文件**: `states.md`
- **内容**: 所有界面状态的明确定义、触发条件、视觉表现、交互行为等

## 设计原则

### 1. 一致性 (Consistency)
- 统一的视觉风格和交互模式
- 组件复用，减少设计碎片化
- 基于 Ant Design 组件库的设计系统
- 保持与现有经营信息模块的视觉一致性

### 2. 可访问性 (Accessibility)
- 支持屏幕阅读器
- 支持动态字体大小
- 确保足够的颜色对比度
- 提供清晰的语义化标签

### 3. 性能 (Performance)
- 保持 60fps 流畅度
- 交互响应时间 <100ms
- 优化图片和资源加载
- 减少不必要的重绘和重排

### 4. 可用性 (Usability)
- 清晰的信息层级
- 直观的操作流程
- 及时的用户反馈
- 友好的错误处理

### 5. 国际化 (Internationalization) *(Constitution Requirement)*
- **多语言支持**: 所有用户可见文本必须支持国际化，至少支持中文和英文
- **文本长度适配**: UI 布局必须适应不同语言的文本长度变化（如德语通常比英语长 30%）
- **动态布局**: 避免固定宽度的文本容器，使用自适应布局
- **RTL 考虑**: 为从右到左（RTL）语言（如阿拉伯语、希伯来语）预留扩展能力
- **语言切换**: 提供明确的语言切换入口和即时生效机制
- **本地化资源**: 统一管理本地化资源文件，使用清晰的命名规范

## 技术实现要求

### Web 平台（当前实现）
- **设计系统**: 基于 Ant Design 组件库
- **样式管理**: 使用内联样式和 CSS 类
- **响应式设计**: 支持不同屏幕尺寸
- **可访问性**: 遵循 WCAG 2.1 标准
- **国际化**: 使用 i18n 库支持多语言

### 设计 Token 结构（未来扩展）
```
DesignTokens/
├── Colors.ts        // 颜色定义
├── Typography.ts    // 字体和文字样式
├── Spacing.ts       // 间距定义
├── Icons.ts         // 图标定义
└── Animation.ts     // 动画时长和缓动函数
```

## 设计规范维护

- 设计规范与功能规格说明（spec.md）同步维护
- 设计变更需要更新本文档和相关规范文件
- 所有设计决策需要记录原因和影响范围
- 视觉规范基于当前经营信息模块的前端代码提取，作为整体系统的视觉标准

