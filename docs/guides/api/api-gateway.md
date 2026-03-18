# NebulaAuth API Gateway

**版本**: 1.0

API网关文档，提供统一入口和路由转发功能

**Base URL**: `nebula-auth-server:port/`

---

## GET /health

**综合健康检查**

检查所有微服务的健康状态

### 响应

#### 状态码: 200 - 健康状态

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| overall | string |  |
| services | []ServiceHealth |  |
| timestamp | integer |  |


---

