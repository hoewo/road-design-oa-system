# Tech 技术文档规范

## 目录结构

```
arckit/tech/
├── INDEX.md              # 技术索引（缩进树形+行数）
├── CONVENTIONS.md        # 本文件
├── _shared/              # 公共资产（扁平）
│   ├── models/           # 数据模型 YAML
│   └── contracts/       # API 契约 YAML
├── _map/                 # 映射与依赖
│   ├── feature-matrix.md # 方案/模型/契约路径与状态
│   ├── RELATIONS.md      # 方案→模型/API、功能→技术映射
│   └── decision-log.md  # 技术决策日志
├── [tech-domain]/        # 技术领域（可选分级）
│   ├── research.md
│   ├── solution.md
│   └── decision.md
├── _spikes/              # POC
└── _archive/
```

## 文件命名
- 目录: kebab-case（如 `user-management/`）
- Markdown: kebab-case（如 `auth-solution.md`）
- YAML 模型: PascalCase（如 `User.yaml`, `OrderItem.yaml`）
- YAML 契约: kebab-case（如 `auth-login.yaml`, `get-user.yaml`）

## 文件大小限制
| 文件类型 | 建议行数 | 警告 | 强制拆分 |
|---------|---------|------|---------|
| INDEX.md | — | >120 行 | >150 行 |
| research.md | 300-600 | — | >800 行 |
| solution.md | 300-500 | >450 行 | >500 行 |
| decision.md | 200-400 | — | >500 行 |
| model/contract YAML | — | — | >200 行（建议拆为多个） |

## 路径与引用
- 跨文档引用使用路径（如 tech/user-management/auth-solution.md、tech/_shared/models/User.yaml）
- 依赖关系在 _map/RELATIONS.md 维护

## 状态标识
- 技术方案: ✅ 已采用 | 🔬 调研中 | 📋 调研完成 | ❌ 已废弃 | ⚪ 待定
- 数据模型: ✅ 已定义 | 🟡 设计中 | ⚪ 待定义
- API 契约: ✅ 已定义 | 🟡 设计中 | ⚪ 待定义

## 数据模型规范
- 格式: YAML，遵循 JSON Schema
- 文件位置: _shared/models/{Entity}.yaml（统一在 _shared）
- 命名: PascalCase，与代码实体名一致
- 必含 metadata 元信息块

## API 契约规范
- 格式: YAML，类 OpenAPI 3.0
- 文件位置: _shared/contracts/{endpoint}.yaml（统一在 _shared）
- 命名: kebab-case，反映端点语义
- 必含 metadata 元信息块

## 引用规范
- 模型间引用: `$ref: "../_shared/models/Error.yaml"`
- 跨领域引用: `$ref: "../../_shared/models/{Entity}.yaml"`
- Markdown 引用: 使用路径（如 spec/…/feature.md、design/…/default.html）
