// services/api.js
// API客户端封装示例
import apiConfig from '../config/api';
import { getToken, refreshToken } from './auth';

// 带自动Token刷新的API请求
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

// 调用业务接口示例
export async function getUserProfile() {
  return await apiRequest('/your-service/v1/user/profile');
}

