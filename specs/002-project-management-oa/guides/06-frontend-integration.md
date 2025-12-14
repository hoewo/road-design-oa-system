# 前端集成

本文档介绍如何在前端应用中集成 NebulaAuth 认证系统，包括登录流程、Token管理、API调用等。

## 📋 前置条件

在开始前端集成之前，请确保：

- NebulaAuth 系统已部署并运行
- 业务服务已开发完成并注册（参考 [服务注册与集成](./05-service-registration.md)）
- 了解 NebulaAuth 的认证流程

## 🔐 认证流程

### 用户管理策略

业务方使用 NebulaAuth 服务时，需要根据业务需求选择合适的用户管理策略：

- **开放注册**：用户可以通过前端注册界面自主注册（参考 [业务服务开发准备](./02-service-development-setup.md#策略1开放注册)）
- **管理员添加**：用户只能由管理员添加，不能自主注册（参考 [业务服务开发准备](./02-service-development-setup.md#策略2不开放注册管理员添加后登录)）

### 完整登录流程

1. **发送验证码**：调用发送验证码接口
2. **用户登录**：使用验证码登录，获取 `access_token` 和 `refresh_token`
3. **存储Token**：将Token保存到 localStorage 或 sessionStorage
4. **调用API**：在API请求中添加 `Authorization: Bearer <token>` Header
5. **刷新Token**：Token过期时自动刷新

### 注册流程（仅适用于开放注册场景）

如果业务方选择开放注册策略，前端需要实现注册功能：

1. **发送注册验证码**：调用发送验证码接口（`purpose: 'register'`）
2. **用户注册**：使用验证码注册，注册成功后自动登录
3. **存储Token**：注册成功后保存 Token（与登录流程相同）

### 客户端配置

根据环境配置不同的 API 地址：

参考代码：`examples/frontend/api-config.js`

```javascript
const config = {
  development: {
    apiBaseURL: 'http://business-server:port',  // 开发环境：直接调用本地业务服务器
    nebulaAuthURL: 'http://nebula-auth-server:port',  // NebulaAuth 服务地址
  },
  production: {
    apiBaseURL: 'http://nebula-auth-server:port',  // 生产环境：通过网关调用
    nebulaAuthURL: 'http://nebula-auth-server:port',  // 网关地址
  }
};
```

**重要提示**：
- **开发环境（self_validate 模式）**：`API_BASE_URL` 指向本地业务服务器（`business-server:port`），**不能指向网关地址**
- **生产环境（gateway 模式）**：`API_BASE_URL` 指向 NebulaAuth 网关地址（`nebula-auth-server:port`），**不能直接指向业务服务器**
- 所有业务接口请求都发送到 `API_BASE_URL`，添加 `Authorization: Bearer <token>` Header

**⚠️ 关键配置规则**：

1. **开发环境配置**：
   ```javascript
   // ✅ 正确：直接请求业务服务器
   apiBaseURL: 'http://business-server:port'
   
   // ❌ 错误：请求网关地址（会导致双重 CORS 头等问题）
   apiBaseURL: 'http://nebula-auth-server:port'
   ```

2. **生产环境配置**：
   ```javascript
   // ✅ 正确：请求网关地址
   apiBaseURL: 'http://nebula-auth-server:port'
   
   // ❌ 错误：直接请求业务服务器（会导致无法获取用户信息）
   apiBaseURL: 'http://business-server:port'
   ```

**常见错误和后果**：

- **错误**：在 `self_validate` 模式下，前端配置 `API_BASE_URL` 为网关地址
- **后果**：
  - 双重 CORS 头：网关和业务服务器都设置了 `Access-Control-Allow-Origin`，浏览器报错：`Access-Control-Allow-Origin cannot contain more than one origin`
  - 认证失败：请求经过网关但业务服务器仍尝试验证 Token，导致认证流程混乱
  - 性能下降：请求经过不必要的网关转发

- **错误**：在 `gateway` 模式下，前端直接请求业务服务器地址
- **后果**：
  - 无法获取用户信息：业务服务器无法从 Header 中读取 `X-User-ID`，返回 `未认证: X-User-ID header 为空`
  - 认证失败：业务服务器期望从网关获取用户信息，但请求未经过网关

详细的问题排查请参考：[故障排除](../reference/troubleshooting.md#问题4认证模式配置错误导致的问题)

## 💻 代码实现

### 认证服务封装

参考代码：`examples/frontend/auth-service.js`

#### 发送验证码

```javascript
export async function sendVerificationCode(codeType, target, purpose = 'login') {
  const response = await fetch(`${apiConfig.nebulaAuthURL}/auth-server/v1/public/send_verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code_type: codeType, target, purpose })
  });
  return await response.json();
}
```

#### 用户注册（仅适用于开放注册场景）

如果业务方选择开放注册策略，需要实现注册功能：

```javascript
// 发送注册验证码
export async function sendRegisterCode(email) {
  return await sendVerificationCode('email', email, 'register');
}

// 用户注册
export async function register(email, code, username) {
  const response = await fetch(`${apiConfig.nebulaAuthURL}/auth-server/v1/public/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      email, 
      code, 
      code_type: 'email', 
      purpose: 'register',
      username 
    })
  });
  const data = await response.json();
  if (data.success) {
    // 注册成功，保存 Token（注册接口会自动登录）
    localStorage.setItem('access_token', data.data.tokens.access_token);
    localStorage.setItem('refresh_token', data.data.tokens.refresh_token);
    
    // 保存用户信息
    if (data.data.user) {
      localStorage.setItem('user_info', JSON.stringify({
        userID: data.data.user.id,
        username: data.data.user.username,
        isAdmin: data.data.user.is_admin,
      }));
    }
    
    return data.data;
  }
  throw new Error(data.error || '注册失败');
}
```

**注意**：如果业务方选择管理员添加策略，前端**不应该**提供注册功能，也不应该调用注册接口。

#### 登录

```javascript
export async function login(email, code, codeType = 'email') {
  const response = await fetch(`${apiConfig.nebulaAuthURL}/auth-server/v1/public/login`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-App-ID': 'your-app-id'  // 可选，应用标识
    },
    body: JSON.stringify({ 
      email, 
      code, 
      code_type: codeType, 
      purpose: 'login' 
    })
  });
  const data = await response.json();
  if (data.success) {
    // 保存Token到localStorage
    localStorage.setItem('access_token', data.data.tokens.access_token);
    localStorage.setItem('refresh_token', data.data.tokens.refresh_token);
    
    // 登录响应包含完整的用户信息（包括 is_admin）
    // data.data.user 包含：id, email, phone, username, avatar_url, is_active, is_verified, is_admin, created_at, updated_at
    // 如果需要，可以保存用户信息到 localStorage
    if (data.data.user) {
      localStorage.setItem('user_info', JSON.stringify({
        userID: data.data.user.id,
        username: data.data.user.username,
        isAdmin: data.data.user.is_admin, // 注意：API 返回的是 is_admin（snake_case）
      }));
    }
    
    return data.data;
  }
  throw new Error(data.error || '登录失败');
}
```

**登录响应结构**：

```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "phone": null,
      "username": "antu0_0",
      "avatar_url": null,
      "is_active": true,
      "is_verified": true,
      "is_admin": true,  // ✅ 包含管理员标识
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    "tokens": {
      "access_token": "...",
      "refresh_token": "..."
    }
  },
  "auth_level": "public"
}
```

#### 刷新Token

```javascript
export async function refreshToken() {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    throw new Error('没有刷新Token');
  }
  
  const response = await fetch(`${apiConfig.nebulaAuthURL}/auth-server/v1/public/refresh_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  const data = await response.json();
  if (data.success) {
    // 注意：刷新Token时返回的data直接是TokenPair，不是data.tokens
    localStorage.setItem('access_token', data.data.access_token);
    localStorage.setItem('refresh_token', data.data.refresh_token);
    return data.data;
  }
  throw new Error(data.error || '刷新Token失败');
}
```

### API客户端封装

参考代码：`examples/frontend/api-client.js`

#### 带自动Token刷新的API请求

```javascript
export async function apiRequest(url, options = {}) {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  let response = await fetch(`${apiConfig.apiBaseURL}${url}`, {
    ...options,
    headers,
  });
  
  // Token过期，尝试刷新
  if (response.status === 401) {
    try {
      await refreshToken();
      // 重新请求
      const newToken = getToken();
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(`${apiConfig.apiBaseURL}${url}`, {
        ...options,
        headers,
      });
    } catch (error) {
      // 刷新失败，跳转到登录页
      window.location.href = '/login';
      throw error;
    }
  }
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '请求失败');
  }
  
  return await response.json();
}
```

#### 调用业务接口

```javascript
// 获取用户信息
export async function getUserProfile() {
  return await apiRequest('/your-service/v1/user/profile');
}
```

## 🎯 使用示例

### 登录页面

```javascript
import { sendVerificationCode, login } from './services/auth';

// 发送验证码
async function handleSendCode() {
  try {
    await sendVerificationCode('email', email, 'login');
    alert('验证码已发送');
  } catch (error) {
    alert('发送验证码失败：' + error.message);
  }
}

// 登录
async function handleLogin() {
  try {
    await login(email, code, 'email');
    // 登录成功，跳转到首页
    window.location.href = '/';
  } catch (error) {
    alert('登录失败：' + error.message);
  }
}
```

### 调用业务接口

```javascript
import { getUserProfile } from './services/api';

// 获取用户信息
async function loadUserProfile() {
  try {
    const profile = await getUserProfile();
    console.log('用户信息：', profile);
  } catch (error) {
    console.error('获取用户信息失败：', error);
  }
}
```

## 🔄 Token管理

### Token有效期

- **Access Token（访问令牌）**：有效期 **2 小时**
- **Refresh Token（刷新令牌）**：有效期 **30 天**

> 💡 **免登录机制**：只要用户在 30 天内至少使用一次应用（触发刷新），Refresh Token 会被刷新，有效期重新计算为 30 天，从而实现持续免登录。

### Token存储

- **推荐方式**：使用 `localStorage` 存储Token（持久化）
- **备选方式**：使用 `sessionStorage` 存储Token（会话级）

> ⚠️ **重要**：使用 `sessionStorage` 时，关闭标签页后 Token 会被清除，无法实现免登录。

### Token刷新策略

#### 自动刷新（被动刷新）

在API请求中检测401错误，自动刷新Token（已在 `apiRequest` 中实现，见上方代码示例）。

#### 主动刷新（页面加载时）

**关键**：页面加载时检查并刷新 Token，这是实现 30 天免登录的关键：

参考代码：`examples/frontend/app-init.js`

```javascript
// app.js 或 main.js
import { initializeAuth } from './services/app-init';

// 应用启动时执行
initializeAuth();
```

#### 刷新Token的响应数据

刷新 Token 时会返回新的 Token 对：

```javascript
{
  "success": true,
  "data": {
    "access_token": "新的访问令牌",
    "refresh_token": "新的刷新令牌",  // ⚠️ 注意：刷新时会返回新的 refresh_token
    "expires_in": 7200,              // Access Token 过期时间（秒），即 2 小时
    "refresh_expires_in": 2592000,   // Refresh Token 过期时间（秒），即 30 天
    "key_id": "密钥ID"
  }
}
```

> ⚠️ **重要**：刷新时必须同时更新 `access_token` 和 `refresh_token`，因为刷新时会返回新的 Token 对。

#### 失败处理

刷新失败时跳转到登录页（已在代码示例中实现）。

### 登出

```javascript
import { logout } from './services/auth';

function handleLogout() {
  logout();
  window.location.href = '/login';
}
```

## 🌐 多应用管理

### AppID 机制

通过 `X-App-ID` Header 区分不同应用：

```javascript
// 登录时添加 AppID
fetch(`${apiConfig.nebulaAuthURL}/auth-server/v1/public/login`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-App-ID': 'web-app'  // 应用标识
  },
  body: JSON.stringify({ ... })
});
```

业务服务可以从 `X-User-AppID` Header 获取应用ID。

## 👤 判断当前用户是否是管理员

### 完整方案

**推荐方案**：登录时保存 + 页面加载时更新 + 统一检查函数

这个方案结合了登录响应的快速性和 API 更新的准确性，既保证了用户体验，又确保了数据的准确性。

参考代码：`examples/frontend/admin-check.js`

#### 1. 登录时保存用户信息

**NebulaAuth 登录接口返回完整的用户信息**，包括 `is_admin` 字段。登录时保存到本地存储：

```javascript
export async function login(email, code, codeType = 'email') {
  const response = await fetch(`${apiConfig.nebulaAuthURL}/auth-server/v1/public/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, code_type: codeType, purpose: 'login' })
  });
  
  const data = await response.json();
  if (data.success) {
    // 保存 Token
    localStorage.setItem('access_token', data.data.tokens.access_token);
    localStorage.setItem('refresh_token', data.data.tokens.refresh_token);
    
    // 保存用户信息（登录响应包含完整的用户对象）
    // user 对象包含：id, email, phone, username, avatar_url, is_active, is_verified, is_admin, created_at, updated_at
    if (data.data.user) {
      localStorage.setItem('user_info', JSON.stringify({
        userID: data.data.user.id,
        username: data.data.user.username,
        isAdmin: data.data.user.is_admin, // 注意：API 返回的是 is_admin（snake_case）
      }));
    }
    
    return data.data;
  }
  throw new Error(data.error || '登录失败');
}
```

**登录响应结构**：

```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "phone": null,
      "username": "antu0_0",
      "avatar_url": null,
      "is_active": true,
      "is_verified": true,
      "is_admin": true,  // ✅ 包含管理员标识
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    "tokens": {
      "access_token": "...",
      "refresh_token": "..."
    }
  },
  "auth_level": "public"
}
```

#### 2. 页面加载时更新用户信息

页面加载时调用用户信息接口，确保 `is_admin` 是最新的：

```javascript
// 更新用户信息（页面加载时调用）
export async function updateUserInfo() {
  try {
    // 调用业务服务的用户信息接口（需要业务服务返回 is_admin 字段）
    const response = await apiRequest('/user-service/v1/user/profile');
    
    if (response.data) {
      localStorage.setItem('user_info', JSON.stringify({
        userID: response.data.user_id || response.data.id,
        username: response.data.username,
        isAdmin: response.data.is_admin || false,
      }));
      return true;
    }
    return false;
  } catch (error) {
    console.error('更新用户信息失败:', error);
    return false;
  }
}
```

#### 3. 统一检查函数

提供一个统一的函数来检查管理员权限，优先使用本地存储（快速），如果不存在则调用 API：

```javascript
// 检查当前用户是否是管理员
export async function isAdmin() {
  // 优先从本地存储读取（快速）
  const userInfoStr = localStorage.getItem('user_info');
  if (userInfoStr) {
    const userInfo = JSON.parse(userInfoStr);
    if (userInfo.isAdmin !== undefined) {
      return userInfo.isAdmin;
    }
  }
  
  // 如果本地存储中没有，调用 API 获取
  try {
    await updateUserInfo();
    const userInfoStr = localStorage.getItem('user_info');
    if (userInfoStr) {
      const userInfo = JSON.parse(userInfoStr);
      return userInfo.isAdmin || false;
    }
  } catch (error) {
    console.error('获取管理员权限失败:', error);
  }
  
  return false;
}
```

#### 4. React/Vue Hook 使用示例

```javascript
// React Hook
export function useAdminCheck() {
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function checkAdmin() {
      try {
        // 页面加载时更新用户信息
        await updateUserInfo();
        const admin = await isAdmin();
        setIsAdmin(admin);
      } catch (error) {
        console.error('检查管理员权限失败:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }
    checkAdmin();
  }, []);

  return { isAdmin, loading };
}

// Vue Composable
export function useAdminCheck() {
  const isAdmin = Vue.ref(false);
  const loading = Vue.ref(true);

  Vue.onMounted(async () => {
    try {
      // 页面加载时更新用户信息
      await updateUserInfo();
      const admin = await isAdmin();
      isAdmin.value = admin;
    } catch (error) {
      console.error('检查管理员权限失败:', error);
      isAdmin.value = false;
    } finally {
      loading.value = false;
    }
  });

  return { isAdmin, loading };
}
```

#### 5. 路由守卫示例

```javascript
// 管理员路由守卫
export async function adminRouteGuard(to, from, next) {
  const admin = await isAdmin();
  if (admin) {
    next();
  } else {
    next('/unauthorized'); // 跳转到未授权页面
  }
}
```

### 使用流程

1. **登录时**：调用 `login()` 函数，自动保存用户信息（包括 `is_admin`）到 localStorage
2. **页面加载时**：调用 `updateUserInfo()` 更新用户信息，确保 `is_admin` 是最新的
3. **检查权限时**：调用 `isAdmin()` 函数，优先使用本地存储，如果不存在则调用 API
4. **路由守卫**：使用 `adminRouteGuard()` 保护管理员页面

### 注意事项

- **前端判断仅用于 UI 显示和路由控制**，真正的权限验证在服务端
- **业务服务的用户信息接口需要返回 `is_admin` 字段**
- API 返回的是 `is_admin`（snake_case），前端使用时可以转换为 `isAdmin`（camelCase）

参考代码：`examples/frontend/admin-check.js`

## ⚠️ 注意事项

### 环境配置

1. **开发环境**：`API_BASE_URL` 指向本地业务服务器
2. **生产环境**：`API_BASE_URL` 指向 NebulaAuth 网关地址
3. **不要直接调用业务服务器域名**：生产环境必须通过网关调用

### 安全性

1. **Token存储**：不要将Token存储在Cookie中（除非使用HttpOnly）
2. **HTTPS**：生产环境必须使用HTTPS
3. **Token过期处理**：及时处理Token过期情况

### 错误处理

1. **统一错误处理**：在API客户端中统一处理错误
2. **用户提示**：友好的错误提示信息
3. **自动重试**：Token刷新失败时自动跳转登录

## ✅ 检查清单

完成前端集成后，请确认：

- [ ] 已配置正确的API地址（开发/生产环境）
- [ ] 已实现登录流程（发送验证码、登录）
- [ ] 已实现Token管理（存储、刷新、登出）
- [ ] 已实现API客户端（自动添加Token、自动刷新）
- [ ] 已测试所有功能（登录、调用API、Token刷新）

## 🔗 下一步

完成前端集成后，您可以：

1. **测试和调试**：参考 [测试与调试](./07-testing-debugging.md)
2. **生产环境部署**：参考 [生产环境部署](./08-production-deployment.md)
3. **了解最佳实践**：参考 [最佳实践](./reference/best-practices.md)

## 📝 相关文档

- [业务接口开发](./04-business-api-development.md) - 业务接口开发指南
- [服务注册与集成](./05-service-registration.md) - 服务注册指南
- [测试与调试](./07-testing-debugging.md) - 测试和调试指南
- [API 参考](./reference/api-reference.md) - 认证API文档

