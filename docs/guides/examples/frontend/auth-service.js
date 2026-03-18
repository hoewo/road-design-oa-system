// services/auth.js
// 认证服务封装示例
import apiConfig from '../config/api';

// 发送验证码
export async function sendVerificationCode(codeType, target, purpose = 'login') {
  const response = await fetch(`${apiConfig.nebulaAuthURL}/auth-server/v1/public/send_verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code_type: codeType, target, purpose })
  });
  return await response.json();
}

// 发送注册验证码（仅适用于开放注册场景）
export async function sendRegisterCode(email) {
  return await sendVerificationCode('email', email, 'register');
}

// 用户注册（仅适用于开放注册场景）
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

// 登录
// 注意：登录响应包含完整的用户信息（data.data.user），包括 is_admin 字段
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
    
    // 登录响应包含完整的用户信息（data.data.user）
    // user 对象包含：id, email, phone, username, avatar_url, is_active, is_verified, is_admin, created_at, updated_at
    // 如果需要保存用户信息，可以：
    // if (data.data.user) {
    //   localStorage.setItem('user_info', JSON.stringify({
    //     userID: data.data.user.id,
    //     username: data.data.user.username,
    //     isAdmin: data.data.user.is_admin, // 注意：API 返回的是 is_admin（snake_case）
    //   }));
    // }
    
    return data.data;
  }
  throw new Error(data.error || '登录失败');
}

// 刷新Token
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

// 获取当前Token
export function getToken() {
  return localStorage.getItem('access_token');
}

// 登出
export function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

