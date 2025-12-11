# NebulaAuth OAuth Server API

**版本**: 1.0

OAuth服务API文档，提供OAuth2授权功能

**Base URL**: `localhost:4434/oauth-server/v1`

---

## GET /admin/oauth/config

**获取OAuth配置**

获取OAuth服务配置（待实现）

### 响应

#### 状态码: 200 - 配置信息

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| message | string |  |
| service | string |  |
| status | string |  |
| timestamp | integer |  |
| auth_level | string |  |


---

## GET /apikey/token

**获取OAuth Token**

使用API密钥获取OAuth Token（待实现）

### 响应

#### 状态码: 200 - Token信息

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| auth_level | string |  |
| message | string |  |
| service | string |  |
| status | string |  |
| timestamp | integer |  |


---

## GET /health

**健康检查**

检查OAuth服务健康状态

### 响应

#### 状态码: 200 - 服务正常

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| database | string |  |
| db_error | string |  |
| service | string |  |
| status | string |  |
| timestamp | integer |  |


---

## GET /public/oauth/status

**OAuth状态检查**

检查OAuth服务状态

### 响应

#### 状态码: 200 - 服务正常

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| auth_level | string |  |
| message | string |  |
| service | string |  |
| status | string |  |
| timestamp | integer |  |


---

