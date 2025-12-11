# NebulaAuth User Service API

**版本**: 1.0

用户服务API文档，提供用户管理功能

**Base URL**: `localhost:3001/user-service/v1`

---

## GET /admin/users/{id}

**获取指定用户信息**

根据用户ID获取用户详细信息

### 请求参数

| 参数名 | 位置 | 类型 | 必填 | 说明 |
|--------|------|------|------|------|
| id | path | string | 是 | 用户ID |

### 响应

#### 状态码: 200 - 获取成功

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| cached | boolean |  |
| data | User |  |
| success | boolean |  |

**User 结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| avatar_url | string |  |
| created_at | string |  |
| email | string |  |
| id | string |  |
| is_admin | boolean |  |
| is_verified | boolean |  |
| updated_at | string |  |
| username | string |  |
| is_active | boolean |  |
| phone | string |  |


#### 状态码: 400 - 请求错误

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| error | string |  |
| success | boolean |  |

#### 状态码: 404 - 用户不存在

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| success | boolean |  |
| error | string |  |


---

## PUT /admin/users/{id}

**更新指定用户信息**

更新指定用户的信息

### 请求参数

| 参数名 | 位置 | 类型 | 必填 | 说明 |
|--------|------|------|------|------|
| id | path | string | 是 | 用户ID |
| request | body |  | 是 | 更新请求 |

### 响应

#### 状态码: 200 - 更新成功

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| success | boolean |  |
| data | User |  |
| message | string |  |

**User 结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| avatar_url | string |  |
| created_at | string |  |
| email | string |  |
| id | string |  |
| is_admin | boolean |  |
| is_verified | boolean |  |
| updated_at | string |  |
| username | string |  |
| is_active | boolean |  |
| phone | string |  |


#### 状态码: 400 - 请求错误

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| error | string |  |
| success | boolean |  |

#### 状态码: 404 - 用户不存在

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| error | string |  |
| success | boolean |  |

#### 状态码: 409 - 邮箱或手机号已被使用

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| error | string |  |
| success | boolean |  |


---

## DELETE /admin/users/{id}

**删除指定用户**

删除指定的用户账号

### 请求参数

| 参数名 | 位置 | 类型 | 必填 | 说明 |
|--------|------|------|------|------|
| id | path | string | 是 | 用户ID |

### 响应

#### 状态码: 200 - 删除成功

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| message | string |  |
| success | boolean |  |

#### 状态码: 400 - 请求错误

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| error | string |  |
| success | boolean |  |

#### 状态码: 404 - 用户不存在

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| error | string |  |
| success | boolean |  |


---

## POST /public/user

**创建用户**

创建新用户，支持邮箱或手机号注册

### 请求参数

| 参数名 | 位置 | 类型 | 必填 | 说明 |
|--------|------|------|------|------|
| request | body |  | 是 | 创建用户请求 |

### 响应

#### 状态码: 201 - 创建成功

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| data | User |  |
| message | string |  |
| success | boolean |  |

**User 结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| is_active | boolean |  |
| is_verified | boolean |  |
| username | string |  |
| avatar_url | string |  |
| created_at | string |  |
| email | string |  |
| is_admin | boolean |  |
| phone | string |  |
| updated_at | string |  |
| id | string |  |


#### 状态码: 400 - 请求错误

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| success | boolean |  |
| error | string |  |

#### 状态码: 409 - 用户已存在

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| error | string |  |
| success | boolean |  |


---

## GET /public/user/email/{email}

**通过邮箱获取用户**

根据邮箱地址获取用户信息

### 请求参数

| 参数名 | 位置 | 类型 | 必填 | 说明 |
|--------|------|------|------|------|
| email | path | string | 是 | 邮箱地址 |

### 响应

#### 状态码: 200 - 获取成功

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| success | boolean |  |
| data | User |  |

**User 结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| updated_at | string |  |
| id | string |  |
| is_active | boolean |  |
| is_verified | boolean |  |
| username | string |  |
| avatar_url | string |  |
| created_at | string |  |
| email | string |  |
| is_admin | boolean |  |
| phone | string |  |


#### 状态码: 404 - 用户不存在

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| error | string |  |
| success | boolean |  |


---

## GET /public/user/phone/{phone}

**通过手机号获取用户**

根据手机号获取用户信息

### 请求参数

| 参数名 | 位置 | 类型 | 必填 | 说明 |
|--------|------|------|------|------|
| phone | path | string | 是 | 手机号 |

### 响应

#### 状态码: 200 - 获取成功

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| data | User |  |
| success | boolean |  |

**User 结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | string |  |
| is_active | boolean |  |
| is_verified | boolean |  |
| username | string |  |
| avatar_url | string |  |
| created_at | string |  |
| email | string |  |
| is_admin | boolean |  |
| phone | string |  |
| updated_at | string |  |


#### 状态码: 404 - 用户不存在

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| success | boolean |  |
| error | string |  |


---

## GET /user/profile

**获取当前用户信息**

获取当前登录用户的详细信息

### 响应

#### 状态码: 200 - 获取成功

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| data | User |  |
| success | boolean |  |

**User 结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | string |  |
| is_active | boolean |  |
| is_admin | boolean |  |
| is_verified | boolean |  |
| phone | string |  |
| updated_at | string |  |
| username | string |  |
| avatar_url | string |  |
| created_at | string |  |
| email | string |  |


#### 状态码: 401 - 未认证

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| error | string |  |
| success | boolean |  |

#### 状态码: 404 - 用户不存在

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| error | string |  |
| success | boolean |  |


---

## PUT /user/profile

**更新当前用户信息**

更新当前登录用户的信息

### 请求参数

| 参数名 | 位置 | 类型 | 必填 | 说明 |
|--------|------|------|------|------|
| request | body |  | 是 | 更新请求 |

### 响应

#### 状态码: 200 - 更新成功

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| message | string |  |
| success | boolean |  |
| data | User |  |

**User 结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | string |  |
| is_active | boolean |  |
| is_admin | boolean |  |
| is_verified | boolean |  |
| phone | string |  |
| updated_at | string |  |
| username | string |  |
| avatar_url | string |  |
| created_at | string |  |
| email | string |  |


#### 状态码: 400 - 请求错误

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| success | boolean |  |
| error | string |  |

#### 状态码: 401 - 未认证

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| error | string |  |
| success | boolean |  |


---

## GET /admin/users

**获取所有用户**

获取系统中的所有用户列表

### 响应

#### 状态码: 200 - 获取成功

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| data | []User |  |
| success | boolean |  |
| cached | boolean |  |
| count | integer |  |

#### 状态码: 500 - 服务器错误

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| error | string |  |
| success | boolean |  |


---

## GET /admin/users/email/{email}

**根据邮箱查找用户**

根据邮箱地址查找用户信息

### 请求参数

| 参数名 | 位置 | 类型 | 必填 | 说明 |
|--------|------|------|------|------|
| email | path | string | 是 | 邮箱地址 |

### 响应

#### 状态码: 200 - 获取成功

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| cached | boolean |  |
| data | User |  |
| success | boolean |  |

**User 结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| avatar_url | string |  |
| created_at | string |  |
| email | string |  |
| id | string |  |
| is_admin | boolean |  |
| is_verified | boolean |  |
| updated_at | string |  |
| username | string |  |
| is_active | boolean |  |
| phone | string |  |


#### 状态码: 400 - 请求错误

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| error | string |  |
| success | boolean |  |

#### 状态码: 404 - 用户不存在

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| error | string |  |
| success | boolean |  |


---

## GET /admin/users/phone/{phone}

**根据手机号查找用户**

根据手机号查找用户信息

### 请求参数

| 参数名 | 位置 | 类型 | 必填 | 说明 |
|--------|------|------|------|------|
| phone | path | string | 是 | 手机号 |

### 响应

#### 状态码: 400 - 请求错误

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| error | string |  |
| success | boolean |  |

#### 状态码: 404 - 用户不存在

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| success | boolean |  |
| error | string |  |

#### 状态码: 200 - 获取成功

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| data | User |  |
| success | boolean |  |
| cached | boolean |  |

**User 结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| updated_at | string |  |
| username | string |  |
| is_active | boolean |  |
| phone | string |  |
| avatar_url | string |  |
| created_at | string |  |
| email | string |  |
| id | string |  |
| is_admin | boolean |  |
| is_verified | boolean |  |



---

