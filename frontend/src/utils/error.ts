/**
 * 从 Axios 或一般异常中提取用户可读的错误信息（供页面 message / Alert 使用）
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function getErrorMessage(error: unknown, defaultMessage: string = '操作失败'): string {
  if (typeof error === 'string' && error.trim()) {
    return error
  }

  if (!isRecord(error)) {
    return defaultMessage
  }

  const response = error.response
  if (isRecord(response) && isRecord(response.data)) {
    const data = response.data
    const errField = data.error
    if (typeof errField === 'string' && errField) {
      return errField
    }
    const msgField = data.message
    if (typeof msgField === 'string' && msgField) {
      return msgField
    }
  }

  const message = error.message
  if (typeof message === 'string' && message) {
    if (
      message.includes('Request failed with status code') ||
      message.includes('Network Error') ||
      message.includes('timeout')
    ) {
      return defaultMessage
    }
    return message
  }

  return defaultMessage
}
