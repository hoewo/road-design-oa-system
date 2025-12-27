<!--
Sync Impact Report:
- Version change: 1.5.1 → 1.6.0
- Added sections:
  - VI. Internationalization: Multi-Language Support (新增国际化原则，适用于所有平台)
- Modified sections:
  - Quality Gates & Review Process: 添加国际化检查要求
- Rationale:
  - 国际化是现代应用的基本要求，必须在项目早期规划
  - 适用于所有技术栈（iOS、Android、Web、Backend）
  - 确保应用能够服务于全球用户
  - 初始支持中英文，为未来扩展更多语言打下基础
- Templates requiring updates:
  - ⚠ .arckit/templates/spec-template.md: 需添加国际化相关的功能需求检查
  - ⚠ .arckit/templates/tasks-template.md: 需添加国际化任务检查项
  - ⚠ .arckit/templates/design-visual-template.md 和 design-interaction-template.md: 需添加多语言文本长度适配的设计要求
  - ✅ .arckit/templates/plan-template.md: Constitution Check 部分会自动包含新原则
  - ✅ .arckit/templates/ios-architecture-template.md: 无需修改（国际化在应用层实现）
  - ✅ .arckit/templates/ios-code-style-templates.md: 无需修改（国际化在应用层实现）
-->

# Constitution

## Core Principles

### I. Code Quality: Model Independence & Separation of Concerns *(iOS Only)*

**适用范围**：本原则仅适用于 iOS 应用开发。

**MUST** 遵循严格的分层架构与职责分离：

- **Model 层**：
  - **领域数据模型**：包含领域数据结构和基于自身状态的简单业务逻辑；禁止依赖 Service、其他 Model；禁止包含业务规则判断（业务逻辑由 View 协调）
  - **视图状态管理**：
    - 简单状态：View 直接使用 `@State` 管理（如 loading、showAlert、selectedTab 等）
    - 复杂状态：需要独立的状态模型（`@Observable` class），用于管理复杂的UI状态和业务状态
  - **状态模型特征**：仅包含自身领域的状态，禁止依赖 Service 或其他 Model

- **Service 层**：
  - **定义**：为 View 提供外部服务的抽象层，包含 View 自身无法实现的功能或需要在多个 View 间复用的功能
  - **职责范围**：
    - ✅ 数据获取、保存、同步（数据通道）
    - ✅ 外部 API 调用和网络通信
    - ✅ 系统服务封装（相机、相册、传感器等）
    - ✅ 第三方SDK封装和集成
    - ✅ 复杂算法实现（OCR、图像处理等）
  - **限制**：禁止包含业务逻辑判断和业务规则处理（业务逻辑由 View 协调）
  - **实现要求**：必须通过环境注入（@Environment）实现协议抽象

- **Utils 层**（工具类）：
  - **定义**：项目独立的工具集合，不依赖项目内的任何其他代码
  - **特征**：可以随时复用到其他项目，不包含业务逻辑
  - **示例**：日期格式化、字符串处理、数学计算、通用扩展等

- **View 层**：拥有最高权限，持有所有数据，访问所有 Service；协调多个 Model 的数据，组合业务逻辑；决定何时调用 Service，管理 UI 状态；通过子 View 拆分实现业务逻辑自然分离。

**View 拆分原则**：
- **拆分动机**：代码长度（body >150行）、职责复杂度、复用需求、逻辑独立性、UI 区域划分、嵌套复杂度（>3层）
- **拆分平衡**：权衡清晰度收益与复杂度成本，避免过度拆分
- **职责分工**：父 View 持有数据并协调，子 View 接收数据并回调，禁止子 View 直接访问数据或 Service

**Rationale**: 
- Model 独立性确保数据层可独立测试
- Service 作为外部服务层，将复杂功能与 View 解耦
- Utils 的项目独立性确保工具可跨项目复用
- View 拆分提供灵活性，基于可读性和可维护性判断
- 状态管理分层（@State vs @Observable）匹配不同复杂度需求

**其他平台**：后端、Web、Android 等平台的架构要求不做具体要求，各平台可自行选择合适的架构模式。

**参考**：详细架构说明和代码示例请参考 `.arckit/templates/ios-architecture-template.md` 和 `.arckit/templates/ios-code-style-templates.md`。

### II. Testing Standards: Swift Testing & Comprehensive Coverage *(iOS Only)*

**适用范围**：本原则仅适用于 iOS 应用开发。

**MUST** 实现全面的测试覆盖（iOS）：

- **单元测试**：所有 Model 和 Service 必须覆盖单元测试
- **UI 测试**：视图使用快照测试或交互测试验证
- **测试框架**：使用 Swift Testing（@Test 标注）
- **测试时机**：
  - 新功能：编写测试 → 确保失败 → 实现功能 → 测试通过
  - 重构：确保所有测试通过后再进行
- **静态分析**：所有代码必须通过 Swift Build Clean 等命令行静态分析检查

**Rationale**: 测试是代码质量的基础保障，确保重构安全和功能正确性。Swift Testing 提供现代化测试体验，静态分析捕获编译期错误。

**其他平台**：后端、Web、Android 等平台的测试标准不做具体要求，各平台可自行选择合适的测试框架和标准。

### III. User Experience Consistency: Design System & Accessibility *(iOS Only)*

**适用范围**：本原则仅适用于 iOS 应用开发。

**MUST** 保证用户体验的一致性和可访问性（iOS）：

- **设计系统**：
  - ✅ 所有颜色、间距、排版必须从 `DesignTokens` 读取
  - ❌ 禁止硬编码设计值（颜色、间距、字体大小等）
  - ✅ 组件优先复用，保证视觉一致性

- **可访问性**：
  - ✅ 必须支持 VoiceOver 无障碍功能
  - ✅ 必须支持动态字体大小
  - ✅ UI 组件必须符合 iOS 可访问性标准

- **UI 响应式特性**：
  - ✅ 充分利用 SwiftUI 声明式代码，最小化样板代码
  - ✅ 通过子 View 拆分实现业务逻辑分离
  - ✅ 子 View 自动响应数据变化，无需手动管理

**Rationale**: 一致的设计系统提升用户学习曲线和使用体验。可访问性确保所有用户都能使用应用。SwiftUI 响应式特性减少样板代码，提升开发效率。

**其他平台**：后端、Web、Android 等平台的用户体验标准不做具体要求，各平台可自行选择合适的 UI/UX 框架和设计系统。

### IV. Performance Requirements: 60fps & Responsiveness *(iOS Only)*

**适用范围**：本原则仅适用于 iOS 应用开发。

**MUST** 满足以下性能目标（iOS）：

- **帧率**：UI 必须保持 60fps 流畅度
- **触控响应**：用户交互响应时间必须 <100ms
- **性能验证**：关键场景必须进行性能与内存目标验证
- **静态分析**：代码必须通过静态分析（Swift Build Clean 等）检查

**Rationale**: 60fps 和 <100ms 响应时间确保流畅的用户体验。性能验证在关键场景确保应用在各种设备上表现良好。

**其他平台**：后端、Web、Android 等平台的性能要求不做具体要求，各平台可自行设定符合平台特性的性能目标。

### V. Requirements Process: Design Specifications & Wireframes

**MUST** 遵循规范的需求制作流程，确保设计规范与线框图完整：

- **设计资源组织**：统一位于 `specs/main/design/` 目录下维护，包含 `wireframes/` 和 `components/` 子目录
- **线框图要求**：必须包含 `overview.md` 总览，覆盖所有关键用户流程和页面状态
- **设计规范要求**：必须包含 `overview.md` 总览和核心文档（visual-design.md、interaction-design.md），以及 `components/` 目录下的组件规范文件
- **工作流程**：需求 → 线框图 → 设计规范 → 技术实现，每个阶段经过评审
- **质量要求**：所有界面有线框图，所有状态有定义，所有设计值使用 DesignTokens，符合无障碍和性能要求

**Rationale**: 规范的设计流程确保设计意图清晰传达，完整的设计文档是高质量实现的必要前提。将线框图和设计规范作为独立阶段，允许更灵活的工作流程安排。

**参考**：详细设计资源模板和使用指南请参考：
- 设计命令：`/arckit.design` 生成所有设计文档
- 设计模板：`.arckit/templates/design-*.md` 和 `design-*.html`

### VI. Internationalization: Multi-Language Support

**适用范围**：本原则适用于所有平台（iOS、Android、Web、Backend）。

**MUST** 确保应用完整支持国际化与本地化：

- **多语言支持**：
  - ✅ 所有用户可见文本必须支持国际化
  - ✅ 初始必须至少支持中文和英文
  - ✅ 为未来添加更多语言预留扩展能力
  - ❌ 禁止在代码中硬编码用户可见文本

- **设计适配**：
  - ✅ UI 布局必须适应不同语言的文本长度变化
  - ✅ 避免固定宽度的文本容器
  - ✅ 考虑从右到左（RTL）语言的支持能力

- **内容组织**：
  - ✅ 本地化资源文件必须统一管理
  - ✅ 本地化 key 命名需清晰且有语义
  - ✅ 提供默认语言回退机制

- **测试要求**：
  - ✅ 所有语言版本必须经过功能测试
  - ✅ 验证不同语言下的 UI 显示正确性
  - ✅ 验证语言切换功能正常工作

**Rationale**: 国际化是现代应用的基本要求，必须在项目早期规划。支持多语言能够扩大用户群体，提升产品竞争力。统一的国际化实现确保维护效率和用户体验一致性。

## Technology Stack Requirements

### 必需的技术栈组件

**MUST** 包含以下技术栈组件（多端支持）：

- **后端（Backend）**：
  - ✅ 必须包含后端服务实现
  - ✅ API 接口设计必须遵循 RESTful 或 GraphQL 标准
  - ✅ 后端必须提供统一的数据接口供前端和移动端调用

- **Web 前端（Web Frontend）**：
  - ✅ 必须包含 Web 应用实现
  - ✅ Web 前端必须能够访问后端 API
  - ✅ Web 前端必须响应式设计，支持多种屏幕尺寸

- **移动端（Mobile）**：
  - ✅ **iOS 应用**：必须包含 iOS 原生应用实现（Swift + SwiftUI）
  - ✅ **Android 应用**：必须包含 Android 原生应用实现
  - ✅ 移动端应用必须能够访问后端 API
  - ✅ 移动端必须遵循各平台的 UI/UX 设计规范

### 技术栈验证

- 所有新功能必须在所有技术栈组件上实现（后端、Web、iOS、Android）
- 跨平台功能必须保持行为一致性
- API 契约必须统一，确保各端正确实现

### 架构要求说明

- **iOS**：必须遵循本 Constitution 中的架构原则（I-IV），参考 `.arckit/templates/ios-architecture-template.md` 获取详细架构指导
- **其他平台**：后端、Web、Android 等平台的架构要求不做具体要求，各平台可自行选择合适的架构模式和设计模式

## Performance Standards

### 性能目标

- **UI 帧率**：60fps（每帧 <16.67ms）
- **触控响应**：<100ms 从触控到视觉反馈
- **内存使用**：关键场景内存占用需在合理范围内
- **启动时间**：应用冷启动时间需符合 iOS 标准

### 性能验证要求

- 关键用户流程必须在目标设备上验证性能
- 使用 Instruments 进行性能分析
- 内存泄漏必须修复
- 长时间运行场景需要验证内存稳定性

## Quality Gates & Review Process

### 代码审查要求

- 所有 PR 必须验证符合 Constitution 原则
- **需求流程检查**：确认设计规范和线框图已完成
- **设计资源检查**：目录结构完整，设计系统总览（overview.md）和摘要（summary.md）存在，所有界面/状态/组件有对应文档，设计值使用 DesignTokens（详见 `/arckit.design` 命令生成的文档）
- **技术栈检查**：确认功能在所需平台（后端、Web、iOS、Android）上实现
- **国际化检查**（所有平台）：
  - 确认所有用户可见文本已国际化
  - 确认至少支持中文和英文
  - 确认 UI 布局适应不同语言的文本长度
  - 确认本地化资源文件组织规范
- **iOS 架构检查**（仅适用于 iOS 代码）：
  - Model 独立性检查：确认 Model 不依赖 Service 或其他 Model
  - Service 职责检查：为 View 提供外部服务的抽象层，包含 View 自身无法实现的功能或需要在多个 View 间复用的功能
  - View 职责检查：确认业务逻辑在 View 层协调
  - 测试覆盖检查：新功能必须包含相应测试（Swift Testing）
  - 设计系统检查：确认无硬编码设计值
  - 性能检查：关键路径需验证性能目标（60fps、<100ms）
  - **代码风格检查**：Struct/Class/Enum 使用、Swift 并发模型、文件组织、协议和泛型使用（详见 ios-code-style-templates.md）
  - **View 拆分检查**：拆分合理性、动机明确性、避免过度拆分、父子 View 职责分工（详见 ios-architecture-template.md）
- **其他平台**：架构、测试、性能等要求不做具体要求，由各平台团队自行制定标准

### 质量门禁

- **iOS 质量门禁**（仅适用于 iOS）：
  - **编译检查**：必须通过 `swift build` 和静态分析,最终任务交付时需要确保`xcodebuild -workspace MyWorkspace.xcworkspace -scheme MyScheme -sdk iphonesimulator build`
  - **测试检查**：所有测试必须通过
  - **可访问性检查**：VoiceOver 和动态字体必须正常工作
  - **国际化检查**：多语言切换功能正常，所有语言版本 UI 显示正确
- **其他平台**（Web、Android、Backend）：
  - **国际化检查**：多语言支持功能正常，本地化资源完整
  - 质量门禁要求不做其他具体要求，由各平台团队自行制定标准

### 复杂度控制

- 新增复杂度必须明确说明原因
- 必须提供更简单方案的拒绝理由（如适用）
- 鼓励通过子 View 拆分降低复杂度

## Governance

本 Constitution 是项目开发的最高指导原则，所有代码、架构决策和开发流程必须符合本 Constitution。

### 修订程序

- **版本控制**：使用语义化版本（MAJOR.MINOR.PATCH）
  - MAJOR：向后不兼容的原则移除或重新定义
  - MINOR：新增原则或实质性扩展指导
  - PATCH：澄清说明、措辞调整、错别字修复
- **修订流程**：任何修订必须：
  1. 记录修订原因和影响范围
  2. 更新相关模板和文档
  3. 同步到所有依赖的模板文件
  4. 生成同步影响报告

### 合规审查

- 所有代码审查必须验证 Constitution 合规性
- 违反 Constitution 的代码必须修正或提供明确的合理性说明
- Constitution 检查必须在 Phase 0 研究前和 Phase 1 设计后执行

### 架构指导

- **iOS 架构**：参考 `.arckit/templates/ios-architecture-template.md` 获取详细的 iOS 架构指导，必须遵循本 Constitution 的核心原则（I-IV）
- **其他平台架构**：后端、Web、Android 等平台的架构指导不做具体要求，各平台可自行选择合适的架构模式和参考文档

**Version**: 1.6.0 | **Ratified**: 2025-11-02 | **Last Amended**: 2025-11-06
