## iOS 架构总览（Swift Package + SwiftUI + SwiftData）

面向 {{PACKAGE_NAME}} 的最终 MV 架构：Model（独立的领域数据）+ Service（数据通道）+ View（协调者与决策者）。基于 SwiftUI 响应式特性，通过子 View 拆分实现业务逻辑的自然分离。

### 技术栈与目标
- **语言/平台**: Swift 6.0+，iOS 18+
- **UI**: SwiftUI（60fps、<100ms 触控响应）
- **数据**: SwiftData（@Model，离线优先）
- **视图状态管理**: observation框架
- **依赖管理**: Swift Package Manager（SPM）
- **测试**: Swift Testing 
- 只使用swift 和 swiftUI，禁止 uikit 等
### 分层与职责

#### Model 层：领域数据与状态管理
- **持久化数据 (@Model)**：
  - 仅包含领域数据结构
  - 简单计算属性（基于自身数据）
  - ❌ 不依赖 Service
  - ❌ 不依赖其他 Model
  - ❌ 不包含 UI 状态
  
- **非持久化业务数据 (@Observable)**：
  - 仅包含自己领域的业务状态
  - 简单业务逻辑（基于自身状态）
  - ❌ 不依赖 Service
  - ❌ 不依赖其他 Model
  - ❌ 不包含 UI 状态

- **视图状态管理**：
  - **简单状态 (@State)**：View 内直接管理（loading、showAlert、selectedTab、isEditing等）
  - **复杂状态 (@Observable)**：独立的状态模型，管理复杂的UI状态和业务状态
  - **状态模型特征**：仅包含自身领域的状态，禁止依赖 Service 或其他 Model

#### Service 层：View 外部服务
- **定义**：为 View 提供外部服务的抽象层，包含 View 自身无法实现的功能或需要在多个 View 间复用的功能
- **职责范围**：
  - ✅ 数据获取、保存、同步（数据通道）
  - ✅ 外部 API 调用和网络通信
  - ✅ 系统服务封装（相机、相册、传感器等）
  - ✅ 第三方SDK封装和集成
  - ✅ 复杂算法实现（OCR、图像处理等）
- **不负责**：❌ 业务逻辑判断、❌ 业务规则处理
- **必须**：通过环境注入（@Environment），协议抽象

#### Utils 层：项目独立工具
- **定义**：项目独立的工具集合，不依赖项目内的任何其他代码
- **特征**：可以随时复用到其他项目，不包含业务逻辑
- **示例**：日期格式化、字符串处理、数学计算、通用扩展等

#### View 层：协调者与决策者
- **最高权限**：持有所有数据，访问所有 Service
- **职责**：
  - ✅ 协调多个 Model 的数据
  - ✅ 组合业务逻辑（基于多个 Model 的数据）
  - ✅ 决定何时调用 Service
  - ✅ 管理 UI 状态（loading、error 等）
  - ✅ 通过子 View 拆分实现业务逻辑分离
- **数据操作**：
  - 持久化数据：`@Query` + `modelContext` 直接操作
  - 非持久化数据：持有 `@Observable` 对象
  - Service：通过 `@Environment` 注入

**SwiftUI 响应式优势**：
- View 只需声明式代码，样板代码极少
- 通过拆分子 View 自然实现业务逻辑分离
- 子 View 自动响应数据变化，无需手动管理

### 目录与组织（iOS）
```
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

### 状态管理与数据流

#### 持久化数据流（SwiftData @Model）
- **数据模型**：`@Model` 定义持久化领域数据。
- **数据查询**：View 使用 `@Query` 自动获取数据，自动响应变化。
- **数据操作**：View 直接通过 `@Environment(\.modelContext)` 进行增删改查。
- **数据流**：`@Query` → View 自动更新；`modelContext` → 持久化存储自动同步。

#### 非持久化数据流（@Observable + Service）
- **业务模型**：`@Observable` 表达非持久化的业务数据与规则（不含 UI 状态）。
- **Service 注入**：`@Environment(\.service)` 注入服务，必须通过环境注入。
- **数据流**：View 决定何时加载 → 调用 Service（环境注入）→ 更新业务状态 → 显示 UI。
- **UI 状态**：`@State` 仅用于视图本地 UI 状态（loading、error、editing 等）。
- **错误处理**：错误和加载状态仅在 View 管理。

### 设计系统
- 所有颜色、间距、排版等从 `DesignTokens` 读取，避免硬编码。
- 组件优先复用，保证一致性与可访问性（VoiceOver、动态字体）。

### 导航
- 使用集中式 `NavigationManager` 管理路由，避免在各 View 分散推送。

### 测试与质量
- 单元测试覆盖 Model/Service；视图使用快照/交互测试。
- 静态分析（Swift Build Clean等命令行命令）通过；性能与内存目标需在关键场景验证。

### 包依赖解析（SPM）
```bash
xcodebuild -resolvePackageDependencies -scmProvider system
```

---

## 代码示例

> **重要**：本文档专注于架构说明和规范。所有代码示例请参考 `.arckit/templates/ios-code-style-templates.md`。

代码风格模板包含以下示例：

1. **持久化数据模型（@Model）**：参考代码风格模板中的 "Struct/Class/Enum 规范使用" 部分
2. **非持久化业务模型（@Observable）**：参考代码风格模板中的 "Struct/Class/Enum 规范使用" 部分
3. **Service 协议与实现**：参考代码风格模板中的 "协议和泛型使用规范" 部分
4. **View 与子 View**：参考代码风格模板中的 "View 拆分规范" 部分
5. **并发编程**：参考代码风格模板中的 "并发编程规范" 部分
6. **导航管理**：参考代码风格模板中的完整示例部分
7. **测试示例**：参考代码风格模板中的相关部分

**View 拆分指导原则**：

View 拆分的核心目标是保持代码的可读性、可维护性和可测试性。

**拆分动机**（考虑拆分的信号）：
- 📏 **代码长度**：`body` 超过 150 行时应考虑拆分（非强制规则）
- 🎯 **职责复杂度**：View 同时处理多个不相关的业务功能
- 🔄 **复用需求**：UI 模式需要在多处使用
- 🧩 **逻辑独立性**：存在可以独立理解和测试的逻辑单元
- 📐 **UI 区域划分**：存在清晰的视觉或功能边界（如 Header、Content、Footer）
- 🌳 **嵌套复杂度**：条件渲染或控制流嵌套层次过深（3层以上）

**拆分决策平衡**：
- ✅ **应该拆分**：当拆分能显著提升代码清晰度、可维护性或可复用性
- ⚖️ **谨慎判断**：权衡拆分带来的复杂度和收益，避免过度工程化
- ❌ **不应拆分**：简单的 UI 元素（如单个按钮、标签）或拆分会增加理解成本

**拆分决策示例**：

| 场景 | 建议 | 理由 |
|------|------|------|
| body 150 行的复杂表单 | ✅ 应该拆分 | 代码过长，难以维护 |
| 包含清晰视觉区域（Header、List、Footer） | ✅ 应该拆分 | 职责边界清晰 |
| 复杂条件渲染（5+ 层嵌套） | ✅ 应该拆分 | 逻辑难以理解 |
| 需要在多个页面复用的卡片组件 | ✅ 应该拆分 | 提升复用性 |
| body 40 行但逻辑简单清晰 | ⚖️ 可选拆分 | 权衡可读性收益 |
| 简单的 HStack 包含 2 个按钮 | ❌ 不应拆分 | 过度拆分增加复杂度 |
| 单一职责的 30 行 View | ❌ 不应拆分 | 已经足够清晰 |

---

## 执行与协作要点

### Model 层与状态管理
| 类型 | 职责 | 可以包含 | 不能包含 |
|------|------|---------|---------|
| @Model (持久化) | 领域数据结构 | 简单计算属性 | ❌ UI 状态<br>❌ 依赖 Service<br>❌ 依赖其他 Model |
| @Observable (业务) | 自己领域的业务状态 | 基于自身的业务逻辑 | ❌ 依赖 Service<br>❌ 依赖其他 Model |
| @State (简单状态) | View 内部简单状态 | loading、showAlert、selectedTab 等 | ❌ 复杂业务状态 |
| @Observable (状态模型) | 复杂 UI/业务状态 | 复杂的状态逻辑 | ❌ 依赖 Service<br>❌ 依赖其他 Model |

### View 作为协调者
- **View 拥有最高权限**：
  - ✅ 持有所有数据（@Query、@Observable）
  - ✅ 访问所有 Service（@Environment）
  - ✅ 决定业务逻辑（组合多个 Model 的数据）
  - ✅ 通过子 View 拆分实现逻辑分离
    - ✅ 按功能职责拆分：每个子 View 负责一个明确的功能模块
    - ✅ 按数据边界拆分：每个子 View 处理一组相关的数据
    - ✅ 按 UI 区域拆分：每个子 View 负责一个独立的 UI 区域
    - ✅ 保持子 View 的可测试性和可复用性
    - ❌ 避免过度拆分：不要为每个 UI 元素都创建子 View
    - ❌ 避免子 View 之间直接通信：通过父 View 协调

- **业务逻辑位置**：
  - 简单逻辑：直接在 View 中
  - 复杂逻辑：拆分为子 View，每个子 View 负责自己的逻辑
  - 跨领域逻辑：父 View 协调多个 Model

### Service 作为 View 外部服务层
- **定义**：为 View 提供外部服务的抽象层
- **职责范围**：
  - ✅ 数据获取、保存、同步（数据通道）
  - ✅ 外部 API 调用和网络通信
  - ✅ 系统服务封装（相机、相册、传感器等）
  - ✅ 第三方SDK封装和集成
  - ✅ 复杂算法实现（OCR、图像处理等）
- **判断标准**：View 自身无法实现的功能或需要在多个 View 间复用的功能
- **限制**：
  - ❌ 不包含业务逻辑判断
  - ❌ 不包含业务规则处理

### Utils 作为项目独立工具
- **定义**：不依赖项目其他代码的工具集合
- **特征**：可跨项目复用，不包含业务逻辑
- **示例**：日期格式化、字符串处理、数学计算、通用扩展

### SwiftUI 响应式优势
- **声明式 UI**：View 只需很少的样板代码
- **自动响应**：数据变化自动触发 UI 更新
- **子 View 拆分**：自然实现业务逻辑分离
- **组合优于继承**：通过组合子 View 构建复杂 UI

### 开发顺序
1. Model（@Model）：定义持久化数据结构
2. 业务 Model（@Observable）：定义各自独立的业务状态
3. Service（如需要）：定义数据通道
4. View：协调所有数据，组合业务逻辑
5. 子 View：拆分复杂逻辑
6. 测试：单元测试 + UI 测试


