# NebulaAuth Auth Server API

**版本**: 1.0

认证服务API文档，提供用户注册、登录、Token验证等功能

**Base URL**: `http://<auth-server-host>:<auth-server-port>/auth-server/v1`

**说明**：
- `<auth-server-host>` 和 `<auth-server-port>` 需要根据实际部署环境替换
- Docker 环境示例：`http://nebula-auth-server:4433/auth-server/v1`
- 开发环境示例：`http://localhost:4433/auth-server/v1`

---

## POST /admin/keys/cleanup

**清理过期密钥**

清理所有过期的JWT密钥

### 响应

#### 状态码: 200 - 清理成功

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| auth_level | string |  |
| cleaned_count | integer |  |
| message | string |  |
| success | boolean |  |


---

## POST /internal/validate_apikey

**验证API密钥**

验证API密钥的有效性（内部接口）

### 请求参数

| 参数名 | 位置 | 类型 | 必填 | 说明 |
|--------|------|------|------|------|
| request | body |  | 是 | API密钥验证请求 |

### 响应

#### 状态码: 400 - 请求错误

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| details | string |  |
| error | string |  |
| success | boolean |  |

#### 状态码: 200 - 验证结果

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| data | ValidateAPIKeyResponse |  |
| success | boolean |  |

**ValidateAPIKeyResponse 结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| username | string |  |
| valid | boolean |  |
| allowed_services | []string |  |
| email | string |  |
| error | string |  |
| expires_at | string |  |
| permissions | []string |  |
| user_id | string |  |



---

## POST /public/refresh_token

**刷新访问令牌**

使用刷新令牌获取新的访问令牌和刷新令牌

### 请求参数

| 参数名 | 位置 | 类型 | 必填 | 说明 |
|--------|------|------|------|------|
| request | body |  | 是 | 刷新令牌请求 |

### 响应

#### 状态码: 200 - 刷新成功

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| auth_level | string |  |
| data | TokenPair |  |
| success | boolean |  |

**TokenPair 结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| access_token | string | 访问令牌 |
| expires_in | integer | access token过期时间(秒) |
| key_id | string | 使用的密钥ID |
| refresh_expires_in | integer | refresh token过期时间(秒) |
| refresh_token | string | 刷新令牌 |


#### 状态码: 400 - 请求错误

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| details | string |  |
| error | string |  |
| success | boolean |  |
| code | string |  |

#### 状态码: 401 - 令牌无效

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| error | string |  |
| success | boolean |  |
| code | string |  |
| details | string |  |


---

## POST /user/logout

**用户登出**

用户登出，支持单设备或所有设备登出

### 请求参数

| 参数名 | 位置 | 类型 | 必填 | 说明 |
|--------|------|------|------|------|
| request | body |  | 否 | 登出请求 |

### 响应

#### 状态码: 401 - 未认证

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| error | string |  |
| success | boolean |  |

#### 状态码: 200 - 登出成功

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| auth_level | string |  |
| message | string |  |
| success | boolean |  |


---

## GET /admin/jwt/status

**获取JWT服务状态**

获取JWT服务的当前状态信息

### 响应

#### 状态码: 200 - 获取成功

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| auth_level | string |  |
| data | object |  |
| success | boolean |  |


---

## GET /user/apikeys

**获取API密钥列表**

获取当前用户的所有API密钥列表

### 响应

#### 状态码: 200 - 获取成功

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| data | []APIKeyResponse |  |
| success | boolean |  |

#### 状态码: 401 - 未认证

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| details | string |  |
| error | string |  |
| success | boolean |  |


---

## DELETE /user/apikeys/{id}

**删除API密钥**

删除指定的API密钥

### 请求参数

| 参数名 | 位置 | 类型 | 必填 | 说明 |
|--------|------|------|------|------|
| id | path | string | 是 | API密钥ID |

### 响应

#### 状态码: 200 - 删除成功

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| message | string |  |
| success | boolean |  |
| data | object |  |


#### 状态码: 400 - 请求错误

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| error | string |  |
| success | boolean |  |
| details | string |  |

#### 状态码: 401 - 未认证

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| details | string |  |
| error | string |  |
| success | boolean |  |

#### 状态码: 404 - API密钥不存在

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| success | boolean |  |
| details | string |  |
| error | string |  |


---

## POST /public/login

**用户登录**

通过验证码进行用户登录，支持邮箱或手机号登录

### 请求参数

| 参数名 | 位置 | 类型 | 必填 | 说明 |
|--------|------|------|------|------|
| request | body |  | 是 | 登录请求 |

### 响应

#### 状态码: 401 - 认证失败

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| code | string |  |
| details | string |  |
| error | string |  |
| success | boolean |  |

#### 状态码: 404 - 用户不存在

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| code | string |  |
| details | string |  |
| error | string |  |
| success | boolean |  |

#### 状态码: 200 - 登录成功

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| auth_level | string |  |
| data | LoginResponseData |  |
| message | string |  |
| success | boolean |  |

**LoginResponseData 结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| tokens | TokenPair |  |
| user | object |  |


#### 状态码: 400 - 请求错误

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| code | string |  |
| details | string |  |
| error | string |  |
| success | boolean |  |


---

## POST /public/register

**用户注册**

通过验证码进行用户注册，支持邮箱或手机号注册

### 请求参数

| 参数名 | 位置 | 类型 | 必填 | 说明 |
|--------|------|------|------|------|
| request | body |  | 是 | 注册请求 |

### 响应

#### 状态码: 201 - 注册成功

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| auth_level | string |  |
| data | RegisterResponseData |  |
| message | string |  |
| success | boolean |  |

**RegisterResponseData 结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| tokens | TokenPair |  |
| user | object |  |


#### 状态码: 400 - 请求错误

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| code | string |  |
| details | string |  |
| error | string |  |
| success | boolean |  |

#### 状态码: 500 - 服务器错误

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| code | string |  |
| details | string |  |
| error | string |  |
| success | boolean |  |


---

## POST /public/verify_code

**验证验证码**

验证邮箱或短信验证码

### 请求参数

| 参数名 | 位置 | 类型 | 必填 | 说明 |
|--------|------|------|------|------|
| request | body |  | 是 | 验证码验证请求 |

### 响应

#### 状态码: 200 - 验证成功

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| message | string |  |
| success | boolean |  |

#### 状态码: 400 - 验证失败

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| code | string |  |
| details | string |  |
| error | string |  |
| success | boolean |  |


---

## POST /user/generate_apikey

**生成API密钥**

为用户生成新的API密钥，用于服务间调用

### 请求参数

| 参数名 | 位置 | 类型 | 必填 | 说明 |
|--------|------|------|------|------|
| request | body |  | 是 | API密钥请求 |

### 响应

#### 状态码: 200 - 生成成功

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| data | APIKeyResponse |  |
| success | boolean |  |

**APIKeyResponse 结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| created_at | string |  |
| name | string |  |
| allowed_services | []string |  |
| api_key | string | 只在生成时返回一次 |
| expires_at | string |  |
| id | string |  |
| is_active | boolean |  |
| last_used_at | string |  |
| permissions | []string |  |


#### 状态码: 400 - 请求错误

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| error | string |  |
| success | boolean |  |
| details | string |  |

#### 状态码: 401 - 未认证

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| error | string |  |
| success | boolean |  |
| details | string |  |


---

## POST /admin/rotate_key

**紧急密钥轮换**

执行紧急密钥轮换操作

### 响应

#### 状态码: 500 - 服务器错误

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| error | string |  |
| success | boolean |  |

#### 状态码: 200 - 轮换成功

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| success | boolean |  |
| auth_level | string |  |
| key_id | string |  |
| message | string |  |


---

## GET /admin/verification/status

**获取验证码服务状态**

获取验证码服务的当前状态信息

### 响应

#### 状态码: 200 - 获取成功

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| auth_level | string |  |
| message | string |  |
| success | boolean |  |


---

## POST /internal/validate_token

**验证JWT令牌**

验证JWT令牌的有效性并返回用户信息（内部接口）

### 请求参数

| 参数名 | 位置 | 类型 | 必填 | 说明 |
|--------|------|------|------|------|
| request | body |  | 是 | 令牌验证请求 |

### 响应

#### 状态码: 200 - 验证结果

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| auth_level | string |  |
| data | ValidateTokenResponse |  |
| success | boolean |  |

**ValidateTokenResponse 结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| error | string |  |
| is_admin | boolean |  |
| role | string |  |
| session_id | string |  |
| user_id | string |  |
| username | string |  |
| valid | boolean |  |
| app_id | string |  |


#### 状态码: 400 - 请求错误

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| details | string |  |
| error | string |  |
| success | boolean |  |
| code | string |  |


---

## POST /public/send_verification

**发送验证码**

发送邮箱或短信验证码

### 请求参数

| 参数名 | 位置 | 类型 | 必填 | 说明 |
|--------|------|------|------|------|
| request | body |  | 是 | 发送验证码请求 |

### 响应

#### 状态码: 200 - 发送成功

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| message | string |  |
| success | boolean |  |

#### 状态码: 400 - 请求错误

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| success | boolean |  |
| code | string |  |
| details | string |  |
| error | string |  |

#### 状态码: 500 - 服务器错误

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| code | string |  |
| details | string |  |
| error | string |  |
| success | boolean |  |


---

## DELETE /user/account

**注销账号**

注销当前用户账号，会退出所有设备并删除用户数据

### 响应

#### 状态码: 200 - 注销成功

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| success | boolean |  |
| auth_level | string |  |
| message | string |  |

#### 状态码: 401 - 未认证

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| error | string |  |
| success | boolean |  |

#### 状态码: 500 - 服务器错误

**响应数据结构:**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| error | string |  |
| success | boolean |  |


---

