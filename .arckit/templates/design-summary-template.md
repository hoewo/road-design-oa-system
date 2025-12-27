---
description: "Design summary template for tasks generation"
---

# [PRODUCT NAME] 设计摘要

**最后更新**: [DATE]  
**版本**: 1.0.0  
**用途**: 供任务拆解（tasks）使用，提供聚合摘要信息

---

## 视觉规范摘要

### 色彩体系
- **主色**: {数量} 个（primary, secondary...）
- **语义色**: {数量} 个（success, warning, error, info...）
- **中性色**: {数量} 个（gray 系列）
- **系统色**: 背景、文本、边框、分隔线等

**详细定义**: 参见 `visual-design.md`

### 字体体系
- **字体等级**: {数量} 个（从 caption 到 largeTitle）
- **字重**: {列举字重，如 regular, medium, bold}

**详细定义**: 参见 `visual-design.md`

### 间距体系
- **间距档位**: {数量} 个
- **范围**: 从 xs ({最小值}pt) 到 3xl ({最大值}pt)

**详细定义**: 参见 `visual-design.md`

### 圆角体系
- **圆角规格**: {数量} 个（如 xs, sm, md, lg）

**详细定义**: 参见 `visual-design.md`

### 阴影体系
- **阴影等级**: {数量} 个（如 sm, md, lg）

**详细定义**: 参见 `visual-design.md`

### 动画体系
- **时长规格**: {数量} 个（如 fast, standard, slow）
- **范围**: {最小值}s - {最大值}s

**详细定义**: 参见 `visual-design.md`

---

## 交互规范摘要

### 核心交互模式

#### 编辑操作
- **规范**: {描述，如"使用 Sheet/弹窗实现"}
- **平台差异**: 
  - iOS: {描述}
  - macOS: {描述}

#### 删除操作
- **规范**: {描述，如"必须二次确认"}
- **确认方式**: {如 Alert 或 ActionSheet}

#### 列表操作
- **iOS**: {描述，如"滑动手势 + 上下文菜单"}
- **macOS**: {描述，如"右键菜单"}

#### 搜索操作
- **规范**: {描述}
- **位置**: {描述}

### 导航模式
- **iOS**: {描述，如"栈式导航（NavigationStack）"}
- **macOS**: {描述，如"三栏布局（NavigationSplitView）"}

### 手势规范
- **iOS**: {列举支持的手势}
- **macOS**: {列举鼠标/触控板操作}

### 动画规范
- **时长**: 
  - 快速: {值}s
  - 标准: {值}s
  - 慢速: {值}s
- **缓动**: {如 ease-in-out}

### 反馈机制
- **触觉反馈** (iOS): {描述}
- **声音反馈** (macOS): {描述}
- **视觉反馈**: {描述}

**详细定义**: 参见 `interaction-design.md`

---

## 组件清单

<!-- ACTION REQUIRED: 从 spec.md 用户故事中提取所需组件，并从组件文件中聚合信息 -->

| 组件名称 | 类型 | 复杂度 | 状态数 | 依赖组件 | 文档路径 |
|----------|------|--------|--------|----------|----------|
| Button | 基础 | 简单 | 4 | 无 | components/button.md |
| TextField | 基础 | 中等 | 6 | 无 | components/text-field.md |
| Label | 基础 | 简单 | 2 | 无 | components/label.md |
| Card | 复合 | 中等 | 2 | Button | components/card.md |
| ListItem | 复合 | 中等 | 3 | Label | components/list-item.md |
| {组件名} | {类型} | {复杂度} | {状态数} | {依赖} | components/{name}.md |

**统计**:
- 基础组件: {数量} 个
- 复合组件: {数量} 个
- 页面组件: {数量} 个
- **总计**: {数量} 个

---

## 页面清单

<!-- ACTION REQUIRED: 从 spec.md 用户故事中提取所需页面，并从线框图文件中聚合信息 -->

| 页面名称 | ViewName | 状态数 | 组件数 | 复杂度 | 优先级 | 文档路径 |
|----------|----------|--------|--------|--------|--------|----------|
| {中文名} | {PascalCase} | {数量} | {数量} | {级别} | P1/P2/P3 | wireframes/{kebab-case}.html |
| 首页 | HomeView | 4 | 8 | 中等 | P1 | wireframes/home-view.html |
| 详情页 | DetailView | 5 | 12 | 复杂 | P1 | wireframes/detail-view.html |
| 设置页 | SettingsView | 3 | 6 | 简单 | P2 | wireframes/settings-view.html |

**统计**:
- P1 优先级页面: {数量} 个
- P2 优先级页面: {数量} 个
- P3 优先级页面: {数量} 个
- **总计**: {数量} 个

---

## 状态规范摘要

### 全局状态
- **加载中** (Loading): 数据加载时显示，居中指示器
- **成功** (Success): 数据加载成功，正常显示内容
- **空状态** (Empty): 无数据时显示，提供引导操作
- **错误** (Error): 加载失败时显示，提供重试操作

### 组件状态
- **Normal**: 正常/默认状态
- **Hover**: 鼠标悬停状态（仅 macOS）
- **Pressed**: 按下/点击状态
- **Disabled**: 禁用状态
- **Selected**: 选中状态（可选）
- **Focus**: 焦点状态（可选）

### 页面特定状态

<!-- ACTION REQUIRED: 从线框图文件中提取页面特定状态 -->

- **{页面名称}**: {特定状态列表}

**详细定义**: 参见各页面线框图文档

---

**版本**: 1.0.0  
**最后更新**: [DATE]

