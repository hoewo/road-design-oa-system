import { get } from './api'
import type { User } from '@/types'

export type UserRole = 'admin' | 'project_manager' | 'business_manager' | 'production_manager' | 'finance' | 'member'

export interface PermissionCheckResponse {
  success: boolean
  data: {
    can_create?: boolean
    can_manage?: boolean
  }
}

export interface AvailableUsersResponse {
  success: boolean
  data: User[]
}

export const permissionService = {
  /**
   * 检查用户是否可以创建项目
   */
  canCreateProject: async (): Promise<boolean> => {
    try {
      // get 函数已经提取了 response.data.data，所以返回的是 {can_create: true} 格式
      const response = await get<{ can_create: boolean }>('/user/permissions/can-create-project')
      return response?.can_create ?? false
    } catch (error) {
      console.error('Failed to check create project permission:', error)
      return false
    }
  },

  /**
   * 检查用户是否可以管理项目负责人
   */
  canManageProjectManagers: async (): Promise<boolean> => {
    try {
      // get 函数已经提取了 response.data.data，所以返回的是 {can_manage: true} 格式
      const response = await get<{ can_manage: boolean }>('/user/permissions/can-manage-project-managers')
      return response?.can_manage ?? false
    } catch (error) {
      console.error('Failed to check manage project managers permission:', error)
      return false
    }
  },

  /**
   * 检查用户是否可以管理项目经营信息
   * @param projectId 项目ID
   */
  canManageBusinessInfo: async (projectId: string | number): Promise<boolean> => {
    try {
      // get 函数已经提取了 response.data.data，所以返回的是 {can_manage: true} 格式
      const response = await get<{ can_manage: boolean }>(
        `/user/permissions/can-manage-business-info?project_id=${projectId}`
      )
      return response?.can_manage ?? false
    } catch (error) {
      console.error('Failed to check manage business info permission:', error)
      // 如果权限检查失败，返回 false 而不是抛出错误
      return false
    }
  },

  /**
   * 检查用户是否可以管理项目生产信息
   * @param projectId 项目ID
   */
  canManageProductionInfo: async (projectId: string | number): Promise<boolean> => {
    try {
      // get 函数已经提取了 response.data.data，所以返回的是 {can_manage: true} 格式
      const response = await get<{ can_manage: boolean }>(
        `/user/permissions/can-manage-production-info?project_id=${projectId}`
      )
      return response?.can_manage ?? false
    } catch (error) {
      console.error('Failed to check manage production info permission:', error)
      // 如果权限检查失败，返回 false 而不是抛出错误
      return false
    }
  },

  /**
   * 获取可用于配置项目负责人的用户列表
   * @param managerType 'business' 或 'production'
   */
  getAvailableUsersForManager: async (managerType: 'business' | 'production'): Promise<User[]> => {
    try {
      // get 函数已经提取了 response.data.data，所以直接返回 User[] 数组
      const users = await get<User[]>(
        `/user/permissions/available-users-for-manager?manager_type=${managerType}`
      )
      return users ?? []
    } catch (error) {
      console.error('Failed to get available users for manager:', error)
      return []
    }
  },

  /**
   * 获取可用于配置项目成员的用户列表
   */
  getAvailableUsersForMember: async (): Promise<User[]> => {
    try {
      // get 函数已经提取了 response.data.data，所以直接返回 User[] 数组
      const users = await get<User[]>('/user/permissions/available-users-for-member')
      return users ?? []
    } catch (error) {
      console.error('Failed to get available users for member:', error)
      return []
    }
  },

  /**
   * 基于用户角色进行权限判断（前端简化方案）
   * 注意：真正的权限验证在后端完成，这里仅用于UI显示控制
   */
  utils: {
    /**
     * 检查用户是否是系统管理员
     */
    isSystemAdmin: (user: User | null | undefined): boolean => {
      if (!user) return false
      // 支持多选角色：检查roles数组是否包含admin
      if (user.roles && user.roles.length > 0) {
        return user.roles.includes('admin')
      }
      // 向后兼容：检查单个role字段
      return user.role === 'admin'
    },

    /**
     * 检查用户是否拥有指定角色
     */
    hasRole: (user: User | null | undefined, role: UserRole): boolean => {
      if (!user) return false
      // 支持多选角色：检查roles数组是否包含指定角色
      if (user.roles && user.roles.length > 0) {
        return user.roles.includes(role)
      }
      // 向后兼容：检查单个role字段
      return user.role === role
    },

    /**
     * 检查用户是否可以创建项目（只有项目管理员角色的用户才能创建项目）
     */
    canCreateProject: (user: User | null | undefined): boolean => {
      if (!user) return false
      // 系统管理员具备所有权限
      if (permissionService.utils.isSystemAdmin(user)) return true
      // 只有项目管理员可以创建项目
      return permissionService.utils.hasRole(user, 'project_manager')
    },

    /**
     * 检查用户是否可以管理项目负责人（项目管理员或系统管理员）
     */
    canManageProjectManagers: (user: User | null | undefined): boolean => {
      if (!user) return false
      return permissionService.utils.isSystemAdmin(user) || permissionService.utils.hasRole(user, 'project_manager')
    },

    /**
     * 检查用户是否可以管理项目成员
     * 系统管理员、项目管理员、项目经营负责人、项目生产负责人可以配置项目成员
     */
    canManageProjectMembers: (
      user: User | null | undefined,
      projectBusinessManagerId?: string,
      projectProductionManagerId?: string
    ): boolean => {
      if (!user) return false
      // 系统管理员和项目管理员可以配置所有类型的项目成员
      if (permissionService.utils.isSystemAdmin(user) || permissionService.utils.hasRole(user, 'project_manager')) return true
      // 项目经营负责人可以配置经营参与人
      // 项目生产负责人可以配置生产人员
      // 这里简化处理，如果用户是经营负责人或生产负责人，且是项目的负责人，则可以配置
      if (permissionService.utils.hasRole(user, 'business_manager') && projectBusinessManagerId === user.id) return true
      if (permissionService.utils.hasRole(user, 'production_manager') && projectProductionManagerId === user.id) return true
      return false
    },
  },
}

