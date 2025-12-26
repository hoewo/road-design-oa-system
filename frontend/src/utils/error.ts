/**
 * 从 Axios 错误对象中提取用户友好的错误信息
 * 优先返回后端返回的具体错误信息，如果没有则返回默认消息
 */
export function getErrorMessage(error: any, defaultMessage: string = '操作失败'): string {
  // 如果是字符串，直接返回
  if (typeof error === 'string') {
    return error
  }

  // 尝试从 response.data 中获取错误信息
  // 后端返回格式: { success: false, error: "具体错误信息", message: "错误类型" }
  if (error?.response?.data) {
    const data = error.response.data
    
    // 优先使用 error 字段（包含详细错误信息）
    if (data.error && typeof data.error === 'string') {
      return data.error
    }
    
    // 其次使用 message 字段
    if (data.message && typeof data.message === 'string') {
      return data.message
    }
  }

  // 如果 response.data 中没有，尝试从 error.message 获取
  if (error?.message && typeof error.message === 'string') {
    // 过滤掉通用的 Axios 错误消息（如 "Request failed with status code 400"）
    const message = error.message
    if (message.includes('Request failed with status code') || 
        message.includes('Network Error') ||
        message.includes('timeout')) {
      return defaultMessage
    }
    return message
  }

  // 最后返回默认消息
  return defaultMessage
}

