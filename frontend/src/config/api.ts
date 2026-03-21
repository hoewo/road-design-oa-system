/**
 * API配置模块
 * 支持从环境变量读取API基础地址和NebulaAuth网关地址
 * 
 * 认证模式说明：
 * - gateway: 通过网关访问，API地址指向网关（如 http://localhost:8080）
 * - self_validate: 直接访问后端，API地址指向后端服务（如 http://localhost:8082）
 * 
 * 配置优先级：
 * 1. window.__APP_*__ (运行时注入)
 * 2. import.meta.env.VITE_* (Vite环境变量)
 * 3. process.env.VITE_* (Node环境变量)
 * 4. 默认值（仅开发环境，生产环境必须配置）
 */

/**
 * 获取当前环境模式
 * 直接访问 import.meta.env.MODE，让 Vite 能够进行静态替换
 */
const getMode = (): 'development' | 'production' => {
  // 直接访问 import.meta.env.MODE，Vite 会在构建时进行静态替换
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE) {
    return import.meta.env.MODE === 'production' ? 'production' : 'development'
  }
  
  // 降级方案：检查 Node.js 环境
    const nodeProcess = (globalThis as any).process
  if (nodeProcess?.env?.NODE_ENV) {
    return nodeProcess.env.NODE_ENV === 'production' ? 'production' : 'development'
  }
  
  return 'development'
}

/**
 * 解析环境变量值
 * 直接访问 import.meta.env，让 Vite 能够进行静态替换
 * 注意：必须直接访问每个环境变量，不能使用动态键访问，否则 Vite 无法进行静态替换
 */
const getEnvValue = (key: string): string | undefined => {
  // 优先级1: window.__APP_*__ (运行时注入)
  const globalWindow = typeof window !== 'undefined' ? window : undefined
  if (globalWindow && (globalWindow as any)[`__APP_${key}__`]) {
    return (globalWindow as any)[`__APP_${key}__`]
  }

  // 优先级2: import.meta.env.VITE_* (Vite环境变量)
  // 直接访问每个环境变量，让 Vite 能够进行静态替换
  // 注意：Vite 只能识别直接访问，不能使用动态键访问
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // 根据 key 直接访问对应的环境变量
    switch (key) {
      case 'VITE_API_BASE_URL':
        return import.meta.env.VITE_API_BASE_URL
      case 'VITE_NEBULA_AUTH_URL':
        return import.meta.env.VITE_NEBULA_AUTH_URL
      case 'VITE_AUTH_MODE':
        return import.meta.env.VITE_AUTH_MODE
      case 'VITE_API_TIMEOUT':
        return import.meta.env.VITE_API_TIMEOUT
      case 'VITE_MAX_FILE_SIZE':
        return import.meta.env.VITE_MAX_FILE_SIZE
      case 'VITE_ALLOWED_FILE_TYPES':
        return import.meta.env.VITE_ALLOWED_FILE_TYPES
      case 'VITE_APP_NAME':
        return import.meta.env.VITE_APP_NAME
      case 'VITE_VERSION':
        return import.meta.env.VITE_VERSION
      default: {
        // 对于其他环境变量，尝试动态访问（但可能无法被 Vite 静态替换）
        const env = import.meta.env as Record<string, unknown>
        if (env[key] != null && env[key] !== '') {
          return String(env[key])
        }
        break
      }
    }
  }

  // 优先级3: process.env.VITE_* (Node环境变量，仅用于构建时)
  const nodeProcess = (globalThis as any).process
  if (nodeProcess?.env?.[key]) {
    return nodeProcess.env[key]
  }

  return undefined
}

/**
 * 获取认证模式
 */
const getAuthMode = (): 'gateway' | 'self_validate' => {
  const value = getEnvValue('VITE_AUTH_MODE')
  if (value === 'gateway' || value === 'self_validate') {
    return value
  }
  // 默认使用 gateway 模式（通过网关访问）
  return 'gateway'
}

/**
 * 解析API基础地址
 * 根据认证模式自动选择：
 * - gateway: 通过网关访问（默认 http://localhost:8080）
 * - self_validate: 直接访问后端（默认 http://localhost:8082）
 */
export const resolveApiBaseUrl = (): string => {
  // 如果明确指定了 VITE_API_BASE_URL，直接使用
  const explicitUrl = getEnvValue('VITE_API_BASE_URL')
  if (explicitUrl) {
    return explicitUrl
  }

  const mode = getMode()
  if (mode === 'production') {
    throw new Error(
      'VITE_API_BASE_URL is required in production environment. ' +
      'Please set it in your environment variables or .env file.'
    )
  }

  // 根据认证模式选择默认地址
  const authMode = getAuthMode()
  let defaultValue: string
  let defaultPort: string

  if (authMode === 'gateway') {
    // Gateway模式：通过网关访问（端口8080）
    defaultPort = '8080'
    defaultValue = `http://localhost:${defaultPort}/project-oa/v1`
  } else {
    // Self_validate模式：直接访问后端（端口8082）
    defaultPort = '8082'
    defaultValue = `http://localhost:${defaultPort}/project-oa/v1`
  }

  console.warn(
    `[API Config] VITE_API_BASE_URL not set, using default for ${authMode} mode: ${defaultValue}. ` +
    'Please configure it in .env file for better control.'
  )
  return defaultValue
}

/**
 * 解析NebulaAuth网关地址
 */
export const resolveNebulaAuthUrl = (): string => {
  const value = getEnvValue('VITE_NEBULA_AUTH_URL')
  if (value) {
    return value
  }

  const mode = getMode()
  if (mode === 'production') {
    throw new Error(
      'VITE_NEBULA_AUTH_URL is required in production environment. ' +
      'Please set it in your environment variables or .env file.'
    )
  }

  // 开发环境默认值
  const defaultValue = 'http://localhost:8080'
  console.warn(
    `[API Config] VITE_NEBULA_AUTH_URL not set, using default: ${defaultValue}. ` +
    'Please configure it in .env file for better control.'
  )
  return defaultValue
}

/**
 * API配置
 * 
 * 配置说明：
 * - 开发环境：如果未配置环境变量，会根据 VITE_AUTH_MODE 自动选择默认值
 * - 生产环境：必须通过环境变量配置，否则会抛出错误
 * 
 * 认证模式说明：
 * - gateway: 通过网关访问，API地址指向网关（默认 http://localhost:8080/project-oa/v1）
 * - self_validate: 直接访问后端，API地址指向后端服务（默认 http://localhost:8082/project-oa/v1）
 * 
 * 配置方式：
 * 1. 创建 .env 文件（推荐）
 * 2. 在部署平台设置环境变量
 * 3. 通过 vite.config.ts 的 define 配置
 * 
 * 参考：frontend/CONFIG.md
 */
export const apiConfig = {
  apiBaseURL: resolveApiBaseUrl(),
  nebulaAuthURL: resolveNebulaAuthUrl(),
  authMode: getAuthMode(),
}

