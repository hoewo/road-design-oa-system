// admin-check.js
// 前端判断当前登录用户是否是管理员的完整方案

import { apiRequest } from './api-client';
import apiConfig from './api-config';

// ============================================
// 1. 登录时保存用户信息
// ============================================

/**
 * 登录并保存用户信息（包含管理员标识）
 * 
 * NebulaAuth 登录接口返回完整的用户信息，包括 is_admin 字段
 */
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

// ============================================
// 2. 页面加载时更新用户信息
// ============================================

/**
 * 更新用户信息（页面加载时调用）
 * 确保 is_admin 是最新的
 */
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

// ============================================
// 3. 统一检查函数
// ============================================

/**
 * 检查当前用户是否是管理员
 * 优先使用本地存储（快速），如果不存在则调用 API
 */
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

/**
 * 从本地存储获取用户信息（同步方法，用于快速检查）
 */
export function getUserInfo() {
  const userInfoStr = localStorage.getItem('user_info');
  if (userInfoStr) {
    return JSON.parse(userInfoStr);
  }
  return null;
}

// ============================================
// 4. React/Vue Hook 使用示例
// ============================================

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
export function useAdminCheckVue() {
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

// ============================================
// 5. 路由守卫示例
// ============================================

/**
 * 管理员路由守卫
 * 在路由配置中使用，保护管理员页面
 */
export async function adminRouteGuard(to, from, next) {
  const admin = await isAdmin();
  if (admin) {
    next();
  } else {
    next('/unauthorized'); // 跳转到未授权页面
  }
}
