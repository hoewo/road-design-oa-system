// app.js 或 main.js
// 应用初始化时的认证检查示例
import { getToken, refreshToken } from './auth-service';

// 检查 Token 是否过期（提前 5 分钟刷新）
export function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000; // 转换为毫秒
    return Date.now() >= (exp - 5 * 60 * 1000); // 提前5分钟
  } catch {
    return true;
  }
}

// 应用初始化时检查认证状态
export async function initializeAuth() {
  const refreshTokenValue = localStorage.getItem('refresh_token');
  
  if (!refreshTokenValue) {
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return;
  }
  
  const accessToken = getToken();
  if (!accessToken || isTokenExpired(accessToken)) {
    try {
      await refreshToken();
      console.log('Token 刷新成功');
    } catch (error) {
      console.error('Token 刷新失败:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }
}

// 应用启动时执行
// initializeAuth();

