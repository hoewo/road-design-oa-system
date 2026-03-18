# 技术方案与数据契约矩阵

与 INDEX.md 同步维护；新建/拆分/归档时同步更新本表与 INDEX。

| 路径 | 简述 | 状态 | 行数 |
|------|------|------|------|
| storage-solution.md | 存储方案：MinIO/OSS 抽象层、文件路径设计 | ✅ | 65 |
| database-solution.md | 数据库方案：GORM、PostgreSQL、golang-migrate | ✅ | 64 |
| data-model-solution.md | 数据模型方案：FinancialRecord、Discipline 设计 | ✅ | 76 |
| auth-solution.md | 认证与路由：Gin、Header 认证、NebulaAuth、Token 刷新 | ✅ | 138 |
| user-admin-solution.md | 管理员预设用户：先查后建、NebulaAuth 同步 | ✅ | 80 |
| _shared/models/User.yaml | 用户实体 | ✅ | 69 |
| _shared/models/Project.yaml | 项目实体 | ✅ | 75 |
| _shared/models/Client.yaml | 甲方实体 | ✅ | 47 |
| _shared/models/ProjectContact.yaml | 项目联系人实体 | ✅ | 38 |
| _shared/models/BiddingInfo.yaml | 招投标信息实体 | ✅ | 41 |
| _shared/models/Contract.yaml | 合同实体 | ✅ | 58 |
| _shared/models/ContractAmendment.yaml | 合同补充协议实体 | ✅ | 58 |
| _shared/models/FinancialRecord.yaml | 财务记录实体 | ✅ | 128 |
| _shared/models/ProductionApproval.yaml | 批复审计实体 | ✅ | 76 |
| _shared/models/ProductionFile.yaml | 生产阶段文件实体 | ✅ | 58 |
| _shared/models/ExternalCommission.yaml | 对外委托实体 | ✅ | 51 |
| _shared/models/File.yaml | 文件实体 | ✅ | 73 |
| _shared/models/Discipline.yaml | 专业字典实体 | ✅ | 40 |
| _shared/models/ProjectMember.yaml | 项目成员实体 | ✅ | 56 |
| _shared/contracts/openapi.yaml | 完整 API 规范 | ✅ | 3488 |

状态：方案 ✅ 已采用 | 🔬 调研中 | 📋 调研完成 | ❌ 已废弃 | ⚪ 待定；模型/API ✅ 已定义 | 🟡 设计中 | ⚪ 待定义

**说明**：_shared/contracts/openapi.yaml 超过 200 行，建议按模块拆分为多个契约文件后再续改。
