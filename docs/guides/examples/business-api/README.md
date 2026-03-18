# 业务接口开发代码示例

本目录包含业务接口开发的代码示例。

## 文件说明

- `complete-service-go.go`: 完整的Go服务示例（包含所有认证级别）
- `health-check-go.go`: 健康检查端点实现示例
- `error-handling-go.go`: 统一错误处理示例
- `communication-protocols.go`: Unix Socket 和 HTTP 通信协议示例（理解网关如何选择协议）
- `admin-check.go`: 业务服务中判断管理员权限的示例
- `admin-create-user.go`: 业务服务中管理员创建用户的示例
  - 方式1：直接调用 NebulaAuth 管理员接口 `POST /user-service/v1/admin/users`（推荐）
  - 方式2：调用 user-service 内部接口（适合需要封装额外逻辑的场景）

