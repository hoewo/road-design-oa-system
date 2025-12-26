# 文件列表 (FileList)

**Feature**: 道路设计公司项目管理系统  
**Created**: 2025-01-28  
**Platform**: Web（基于 Ant Design）

<!--
  This file defines the FileList component specification.
  Location: specs/main/design/components/file-list.md
  
  All components are based on Ant Design component library with custom styling.
-->

## 组件信息
- **组件名称**: 文件列表
- **组件标识**: `FileList` (自定义组件)
- **分类**: 复合组件

## 用途说明
用于展示文件列表，支持文件下载和删除操作。主要用于变更洽商和竣工验收等简单的文件管理场景。

## 视觉规范

**尺寸**:
- **宽度**: 100% 父容器宽度
- **文件项内边距**: `10px`
- **文件项外边距**: `marginBottom: 10px`
- **文件项最小高度**: `40px`

**颜色**:
- **文件项背景色**: `#fff` (白色)
- **文件项边框**: `1px solid #ccc`
- **链接颜色**: `#1890ff` (蓝色)
- **删除链接颜色**: `#ff4d4f` (红色)
- **文件信息文字颜色**: `#999` (灰色)

**字体**:
- **文件名**: 默认字体，可点击链接样式
- **文件信息**: `fontSize: 14px`, `color: #999`
- **操作链接**: `fontSize: 14px`

**布局**:
- **文件项**: `display: flex`, `justifyContent: space-between`, `alignItems: center`
- **文件信息区域**: `flex: 1`
- **操作区域**: `display: flex`, `gap: 10px`

**圆角**:
- 无圆角（使用边框）

## 状态定义

**正常状态 (Normal)**:
- **外观**: 白色背景，灰色边框
- **交互**: 文件名可点击下载，删除链接可点击删除

**悬停状态 (Hover)**:
- **文件名链接**: 下划线显示
- **删除链接**: 颜色加深

**加载状态 (Loading)**:
- **外观**: 显示加载提示文字
- **交互**: 禁用所有操作

**空状态 (Empty)**:
- **外观**: 显示空状态提示文字
- **交互**: 无

## 属性规范

| 属性名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| files | FileItem[] | 是 | [] | 文件列表数据 |
| onDownload | (fileId: string, fileName: string) => void | 否 | - | 下载文件回调 |
| onDelete | (fileId: string) => void | 否 | - | 删除文件回调 |
| showActions | boolean | 否 | true | 是否显示操作按钮（下载、删除） |
| loading | boolean | 否 | false | 是否加载中 |
| emptyText | string | 否 | '暂无文件' | 空状态提示文字 |

**FileItem 类型**:
```typescript
interface FileItem {
  id: string | number
  file_id: string | number
  file?: {
    original_name: string
    file_size: number
  }
  created_at: string
}
```

## 交互行为

**文件下载**:
- 点击文件名链接，触发 `onDownload` 回调
- 传递文件ID和文件名

**文件删除**:
- 点击删除链接，触发 `onDelete` 回调
- 传递文件ID
- 建议在删除前显示确认对话框

**文件信息显示**:
- 显示文件名（可点击）
- 显示文件大小（格式化显示，如 5.5MB）
- 显示上传时间（格式化显示，如 2024-04-15）

## 无障碍支持

**语义化**:
- 使用语义化 HTML 结构
- 文件名使用 `<a>` 标签，提供下载功能
- 删除操作使用按钮或链接，提供明确的删除提示

**键盘导航**:
- 支持 Tab 键导航
- 支持 Enter 键触发操作

**屏幕阅读器**:
- 为文件项提供清晰的标签
- 为操作按钮提供描述性文本

## 使用示例

**基本用法**:
```tsx
<FileList
  files={fileList}
  onDownload={(fileId, fileName) => {
    // 下载文件逻辑
    handleDownload(fileId, fileName)
  }}
  onDelete={(fileId) => {
    // 删除文件逻辑（建议先显示确认对话框）
    handleDelete(fileId)
  }}
/>
```

**只读模式**:
```tsx
<FileList
  files={fileList}
  showActions={false}
/>
```

**加载状态**:
```tsx
<FileList
  files={[]}
  loading={true}
/>
```

**空状态**:
```tsx
<FileList
  files={[]}
  emptyText="暂无文件，请上传文件"
/>
```

## 设计注意事项
- 文件列表项统一使用 `10px` 内边距和 `10px` 下边距
- 文件信息（大小、时间）使用灰色文字，与文件名区分
- 删除操作使用红色链接，提示危险操作
- 支持多文件展示，按上传时间倒序排列

## 实现注意事项
- 使用 Ant Design 的 `List` 或自定义 `div` 实现
- 文件大小需要格式化显示（B、KB、MB、GB）
- 上传时间需要格式化显示（YYYY-MM-DD 或 YYYY-MM-DD HH:mm）
- 删除操作建议使用 Modal.confirm 确认对话框
- 文件下载使用 `window.open` 或 `a` 标签下载

## 相关组件
- **Card**: 文件列表通常放在 Card 组件中
- **Button**: 上传文件按钮
- **Modal**: 删除确认对话框
- **Upload**: 文件上传组件

