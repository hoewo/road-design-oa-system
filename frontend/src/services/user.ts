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

export interface UpdateUserRequest {
  email?: string
  real_name?: string
  role?: string
  department?: string
  phone?: string
  is_active?: boolean
}

export const userService = {
  // List users with pagination and filtering
  listUsers: async (
    params?: ListUsersParams
  ): Promise<PaginatedResponse<User>> => {
    return getPaginated<User>('/user/users', params)
  },

  // Get user by ID
  getUser: async (id: number): Promise<User> => {
    return get<User>(`/user/users/${id}`)
  },

  // Create new user
  createUser: async (data: CreateUserRequest): Promise<User> => {
    return post<User>('/user/users', data)
  },

  // Update user
  updateUser: async (id: number, data: UpdateUserRequest): Promise<User> => {
    return put<User>(`/user/users/${id}`, data)
  },
}
