---
description: "Design system overview template"
---

# [PRODUCT NAME] 设计体系总览

**最后更新**: [DATE]  
**版本**: 1.0.0

## 文档索引

### 摘要文档
- **summary.md** - 组件清单、页面清单、规范摘要（供 tasks 使用）

### 规范文档
- **visual-design.md** - DesignTokens（色彩、字体、间距、圆角、阴影、动画）
- **interaction-design.md** - 交互模式、手势、导航、反馈

### 组件文档
- **components/** - 每个组件独立文档
  <!-- ACTION REQUIRED: 列举所有组件 -->
  - button.md
  - text-field.md
  - {其他...}

### 线框图文档
- **wireframes/** - 每个页面独立 HTML 文档
  <!-- ACTION REQUIRED: 列举所有页面 -->
  - home-view.html
  - detail-view.html
  - {其他...}

---

## 设计原则

### 1. 一致性
- 设计元素统一（颜色、字体、间距）
- 交互模式统一

### 2. 无障碍
- VoiceOver、Dynamic Type
- 色彩对比度符合 WCAG AA

### 3. 性能
- 60fps UI, <100ms 响应

### 4. 易用性
- 符合平台规范（iOS HIG / macOS HIG）
- 错误提示清晰

### 5. 国际化
- 多语言支持（至少中英文）
- 布局适应文本长度

---

## 技术要求

### iOS
- 单窗口、NavigationStack
- Dynamic Type、Dark Mode、VoiceOver

### macOS
- 三栏布局 (Sidebar-List-Detail)、NavigationSplitView
- 菜单栏、工具栏、键盘快捷键

### DesignTokens
- 结构: `DesignTokens.Category.property`
- 禁止: 硬编码颜色、尺寸、字体

---

**版本**: 1.0.0  
**最后更新**: [DATE]
