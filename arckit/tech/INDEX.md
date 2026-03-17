# 技术索引

✅ 已采用 | 🔬 调研中 | 📋 调研完成 | ❌ 已废弃 | ⚪ 待定

- project-management/ 项目管理OA技术方案：存储、数据库、认证、数据模型、文件路径。✅
  - storage-solution.md 存储方案：MinIO/OSS统一抽象层接口、文件存储路径设计。✅ (65行)
  - database-solution.md 数据库方案：GORM ORM、PostgreSQL/RDS兼容、golang-migrate迁移策略。✅ (64行)
  - data-model-solution.md 数据模型方案：FinancialRecord统一财务实体、Discipline专业字典设计。✅ (76行)
  - auth-solution.md 认证与路由方案：Gin路由格式、Header认证中间件、NebulaAuth集成、Token刷新。✅ (138行)
  - user-admin-solution.md 管理员预设用户方案：先查询后创建流程、NebulaAuth用户同步机制。✅ (80行)
- _shared/ 共享数据资产：跨领域数据模型与API契约。
  - models/ 数据模型：14个核心实体定义。✅
    - User.yaml 用户实体：基础属性、角色枚举、权限规则。✅ (69行)
    - Project.yaml 项目实体：基本信息、负责人关联、软删除策略。✅ (75行)
    - Client.yaml 甲方实体：基础信息、唯一性约束。✅ (47行)
    - ProjectContact.yaml 项目联系人实体：项目级别联系人、与甲方分离的设计。✅ (38行)
    - BiddingInfo.yaml 招投标信息实体：多文件数组字段、专家费通过FinancialRecord管理。✅ (41行)
    - Contract.yaml 合同实体：金额明细（设计费/勘察费/咨询费）、合同费率。✅ (58行)
    - ContractAmendment.yaml 合同补充协议实体：关联主合同、影响总应收金额。✅ (58行)
    - FinancialRecord.yaml 财务记录实体：统一7类财务场景、类型与方向枚举。✅ (128行)
    - ProductionApproval.yaml 批复审计实体：默认引用合同金额、支持手工覆盖。✅ (76行)
    - ProductionFile.yaml 生产阶段文件实体：阶段类型、校审单、评分。✅ (58行)
    - ExternalCommission.yaml 对外委托实体：委托类型、评分、委托合同。✅ (51行)
    - File.yaml 文件实体：存储路径规范、软删除、禁止文件类型。✅ (73行)
    - Discipline.yaml 专业字典实体：全局专业与项目级专业。✅ (40行)
    - ProjectMember.yaml 项目成员实体：成员角色枚举、专业关联、一人多角色。✅ (56行)
  - contracts/ API契约。✅
    - openapi.yaml 完整API规范：所有接口定义、请求响应结构、错误码。✅ (3488行)
