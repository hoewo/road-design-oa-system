# NebulaAuth Service Registry API

**版本**: 1.0

服务注册中心API文档，提供服务注册与发现功能

**Base URL**: `http://<service-registry-host>:<service-registry-port>/service-registry/v1`

**说明**：
- `<service-registry-host>` 和 `<service-registry-port>` 需要根据实际部署环境替换
- Docker 环境示例：`http://nebula-service-registry:4435/service-registry/v1`
- 开发环境示例：`http://localhost:4435/service-registry/v1`

---

## GET /admin/services

**获取所有服务**

获取服务注册中心的所有服务列表

### 响应

#### 状态码: 200 - 服务列表

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| count | integer |  |
| services | []ServiceRegistry |  |

#### 状态码: 500 - 服务器错误

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| error | string |  |


---

## POST /admin/services

**创建服务注册**

在服务注册中心创建新的服务注册

### 请求参数

| 参数名 | 位置 | 类型 | 必填 | 说明 |
|--------|------|------|------|------|
| request | body |  | 是 | 服务信息 |

### 响应

#### 状态码: 201 - 创建成功

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| message | string |  |
| service | ServiceRegistry |  |

**ServiceRegistry 结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| created_at | string |  |
| host | string |  |
| id | integer |  |
| port | integer |  |
| server_name | string |  |
| url | string |  |
| status | string | active, inactive, deleted |
| updated_at | string |  |
| user_id | string |  |


#### 状态码: 400 - 请求错误

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| error | string |  |


---

## GET /admin/services/{server_name}

**根据服务名称获取服务**

根据服务名称获取服务详细信息

### 请求参数

| 参数名 | 位置 | 类型 | 必填 | 说明 |
|--------|------|------|------|------|
| server_name | path | string | 是 | 服务名称 |

### 响应

#### 状态码: 200 - 服务信息

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| service | ServiceRegistry |  |

**ServiceRegistry 结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| url | string |  |
| status | string | active, inactive, deleted |
| updated_at | string |  |
| user_id | string |  |
| created_at | string |  |
| host | string |  |
| id | integer |  |
| port | integer |  |
| server_name | string |  |


#### 状态码: 404 - 服务不存在

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| error | string |  |


---

## PUT /admin/services/{server_name}

**更新服务**

更新服务注册信息

### 请求参数

| 参数名 | 位置 | 类型 | 必填 | 说明 |
|--------|------|------|------|------|
| server_name | path | string | 是 | 服务名称 |
| request | body |  | 是 | 更新信息 |

### 响应

#### 状态码: 200 - 更新成功

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| message | string |  |
| service | ServiceRegistry |  |

**ServiceRegistry 结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| url | string |  |
| status | string | active, inactive, deleted |
| updated_at | string |  |
| user_id | string |  |
| created_at | string |  |
| host | string |  |
| id | integer |  |
| port | integer |  |
| server_name | string |  |


#### 状态码: 400 - 请求错误

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| error | string |  |


---

## DELETE /admin/services/{server_name}

**删除服务**

从服务注册中心删除服务

### 请求参数

| 参数名 | 位置 | 类型 | 必填 | 说明 |
|--------|------|------|------|------|
| server_name | path | string | 是 | 服务名称 |

### 响应

#### 状态码: 200 - 删除成功

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| message | string |  |

#### 状态码: 400 - 请求错误

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| error | string |  |


---

