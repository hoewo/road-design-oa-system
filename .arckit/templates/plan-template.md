# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/arckit.plan` command. See `.arckit/templates/commands/plan.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [single/web/mobile - determines source structure]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

**Technology Stack** (Constitution Requirement):
- **Backend**: [e.g., Node.js, Python FastAPI, Java Spring Boot or NEEDS CLARIFICATION]
- **Web Frontend**: [e.g., React, Vue, Angular or NEEDS CLARIFICATION]
- **iOS**: [Swift + SwiftUI, iOS 18+ or NEEDS CLARIFICATION]
- **Android**: [Kotlin/Java, target API level or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

验证以下 Constitution 原则的合规性：

- **需求制作流程**：
  - ✅ 设计规范：功能特性包含完整的设计规范文档（视觉设计、交互设计、组件规范、状态定义）
  - ✅ 线框图：所有用户界面包含线框图（覆盖关键用户流程和页面状态）
  - ✅ 工作流程：遵循 需求 → 线框图 → 设计规范 → 技术实现

- **技术栈要求**：
  - ✅ 后端：包含后端服务实现（RESTful 或 GraphQL API）
  - ✅ Web 前端：包含 Web 应用实现（响应式设计）
  - ✅ iOS：包含 iOS 原生应用实现（Swift + SwiftUI）
  - ✅ Android：包含 Android 原生应用实现

- **国际化要求**（所有平台）：
  - ✅ **多语言支持**：
    - 所有用户可见文本支持国际化
    - 至少支持中文和英文
  - ✅ **UI 适配**：
    - UI 布局适应不同语言的文本长度变化
    - 避免固定宽度的文本容器
  - ✅ **实现规范**：
    - iOS: 使用 LocalizedStringKey 和 .strings 文件或 String Catalog
    - Android: 使用 strings.xml 资源文件
    - Web: 使用标准 i18n 框架（如 react-i18next、vue-i18n）
    - Backend: API 响应中的用户消息支持多语言

- **iOS 架构要求**（仅适用于 iOS 代码）：
  - ✅ **代码质量**：
    - Model 独立性：Model 不依赖 Service、其他 Model；视图状态管理分层（简单状态用 @State，复杂状态用 @Observable）
    - Service 作为 View 外部服务层：包含数据通道、系统服务封装、复杂算法等，不包含业务逻辑判断
    - View 协调者：业务逻辑在 View 层协调，通过子 View 拆分实现（代码长度 >150 行时考虑拆分）
  - ✅ **测试标准**：
    - 新功能包含相应测试（Swift Testing）
    - Model 和 Service 有单元测试覆盖
    - 视图有快照或交互测试（如适用）
  - ✅ **用户体验一致性**：
    - 设计值从 DesignTokens 读取，无硬编码
    - 可访问性：支持 VoiceOver 和动态字体
  - ✅ **性能要求**：
    - UI 目标：60fps
    - 触控响应：<100ms
    - 静态分析：通过 Swift Build Clean 检查

- **其他平台**（后端、Web、Android）：
  - 架构、测试、性能等要求不做具体要求，由各平台团队自行制定标准

如有违反，请在 Complexity Tracking 部分说明合理性。

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/arckit.plan command output)
├── research.md          # Phase 0 output (/arckit.plan command)
├── data-model.md        # Phase 1 output (/arckit.plan command)
├── quickstart.md        # Phase 1 output (/arckit.plan command)
├── contracts/           # Phase 1 output (/arckit.plan command)
└── tasks.md             # Phase 2 output (/arckit.tasks command - NOT created by /arckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

android/
└── [platform-specific structure: feature modules, UI flows, platform tests]

ios/{{PROJECT_NAME}}/{{PROJECT_NAME}}Package/
├── Sources/{{PROJECT_NAME}}Package/
│   ├── Views/
│   │   └──  [Name]/          # 页面模块文件夹
│   │      ├── [Name]View/          # 主页面
│   │      ├── [ComponentName]View/  # 组件（子视图，视图和业务逻辑拆分）
│   ├── Models/
│   │   ├── Swiftdata/          # 持久化 @Model 
│   │   ├── Observable/          # 非持久化@Observable
│   ├── Services/ # 协议与实现，环境键    
│   ├── DesignSystem/
│   │   └── Generated/       # 设计令牌
│   ├── Navigation/
│   └── Utils/
└── Tests/
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
