import { get, post, put, getPaginated } from './api'
import type { User, PaginatedResponse } from '@/types'

export interface ListUsersParams {
  page?: number
  size?: number
  keyword?: string
  role?: string
  is_active?: boolean
}

export interface CreateUserRequest {
  username: string
  email: string
  password: string
  real_name: string
  role: string
  department?: string
  phone?: string
}

// CreateNebulaAuthUserRequest 创建NebulaAuth用户请求（管理员预设用户）
// 包含NebulaAuth字段和OA业务字段
export interface CreateNebulaAuthUserRequest {
  // NebulaAuth字段
  email: string
  phone?: string
  username: string
  is_verified?: boolean
  is_active?: boolean
  // OA业务字段
  real_name?: string   // 真实姓名
  role?: string        // OA角色（可选，如果NebulaAuth is_admin=true则会被覆盖为admin）
  department?: string  // 部门
}

// NebulaAuthUser NebulaAuth用户信息
export interface NebulaAuthUser {
  id: string
  email: string
  phone?: string
  username: string
  is_admin: boolean
  is_verified: boolean
  is_active: boolean
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface UpdateUserRequest {
  email?: string
  real_name?: string
  role?: string
  department?: string
  phone?: string
  is_active?: boolean
}

export const userService = {
  // List users with pagination and filtering (admin only)
  listUsers: async (
    params?: ListUsersParams
  ): Promise<PaginatedResponse<User>> => {
    return getPaginated<User>('/admin/users', params)
  },

  // Get user by ID (admin only)
  getUser: async (id: string): Promise<User> => {
    return get<User>(`/admin/users/${id}`)
  },

  // Create new user (legacy, for backward compatibility)
  createUser: async (data: CreateUserRequest): Promise<User> => {
    return post<User>('/user/users', data)
  },

  // Update user (admin only)
  updateUser: async (id: string, data: UpdateUserRequest): Promise<User> => {
    return put<User>(`/admin/users/${id}`, data)
  },

  // Create NebulaAuth user (admin only)
  // 调用业务服务的admin/users接口，内部会调用NebulaAuth User Service API
  createNebulaAuthUser: async (data: CreateNebulaAuthUserRequest): Promise<NebulaAuthUser> => {
    return post<NebulaAuthUser>('/admin/users', data)
  },
}
