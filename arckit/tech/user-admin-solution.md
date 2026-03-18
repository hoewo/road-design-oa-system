# 管理员预设用户技术方案

**领域**: project-management  
**状态**: ✅ 已采用  
**最后更新**: 2026-03-17

## 概述

研究如何在项目管理系统中实现管理员预设（新建）用户的功能，采用"先查询后创建"的优化流程，确保 OA 本地数据库和 NebulaAuth 之间的数据一致性。

## 完整业务流程

```
OA前端 → OA后端 → [查询OA本地数据库] → [查询NebulaAuth] → [创建NebulaAuth用户（如不存在）] → [同步到OA本地数据库] → OA前端
```

### 步骤 1：OA 前端 → OA 后端

接口：`POST /project-oa/v1/admin/users`

请求体（邮箱和手机号二选一，至少提供其中一个）：
```json
{
  "email": "user@example.com",
  "phone": "13800138000",
  "username": "newuser",
  "is_verified": false,
  "is_active": true,
  "real_name": "新用户",
  "role": "member",
  "department": "设计部"
}
```

### 步骤 2：查询 OA 本地数据库

- 通过邮箱或用户名查询 OA 本地数据库
- **如果已存在**：直接更新 OA 业务字段（real_name, role, department），返回结果，**流程结束**

### 步骤 3：查询 NebulaAuth（OA 本地不存在时）

查询方式（邮箱优先）：
1. 邮箱查询（管理员接口，需要 Token）：`GET /user-service/v1/admin/users/email/{email}`
2. 手机号查询（管理员接口，需要 Token）：`GET /user-service/v1/admin/users/phone/{phone}`

- **如果 NebulaAuth 已存在**：同步到 OA 本地数据库 → 步骤 5

### 步骤 4：创建 NebulaAuth 用户（NebulaAuth 不存在时）

接口：`POST /user-service/v1/admin/users`

### 步骤 5：同步到 OA 本地数据库

**角色映射规则**：
- NebulaAuth `is_admin = true` → OA `RoleAdmin`（强制覆盖）
- NebulaAuth `is_admin = false` → 使用前端传入的 `role`（默认 `RoleMember`）

**数据来源**：
- NebulaAuth：`id`, `email`, `phone`, `username`, `is_admin`, `is_active`, `is_verified`
- OA 前端：`real_name`, `role`（可选），`department`（可选）

## 关键要点

- 必须验证管理员权限（通过 `is_admin` 检查）
- 使用管理员 Token 调用 NebulaAuth User Service API
- **优化流程**：先查询 OA 本地数据库，再查询 NebulaAuth，最后创建并同步
- 避免重复创建，提高性能和数据一致性

## 错误处理

- 权限不足：返回 403 Forbidden
- 用户已存在：返回 409 Conflict
- NebulaAuth 服务不可用：返回 500 Internal Server Error
- 参数验证失败：返回 400 Bad Request

## 备选方案

- 直接操作 NebulaAuth 数据库：违反架构原则
- 使用 NebulaAuth 管理界面：用户体验差，需要在多个系统间切换
- 业务服务自己管理用户：不符合统一认证架构
