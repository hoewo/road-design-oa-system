import { get, post, put, del } from './api'
import type { ProjectMember, MemberRole } from '@/types'

export interface CreateProjectMemberPayload {
  user_id: string // UUID string
  role: MemberRole
  join_date: string
  leave_date?: string
  is_active?: boolean
}

export interface UpdateProjectMemberPayload {
  role?: MemberRole
  join_date?: string
  leave_date?: string
  is_active?: boolean
}

export const projectMemberService = {
  list: async (projectId: string | number): Promise<ProjectMember[]> => {
    return get<ProjectMember[]>(`/user/projects/${projectId}/members`)
  },

  create: async (
    projectId: string | number,
    data: CreateProjectMemberPayload
  ): Promise<ProjectMember> => {
    return post<ProjectMember>(`/user/projects/${projectId}/members`, data)
  },

  update: async (
    memberId: string | number,
    data: UpdateProjectMemberPayload
  ): Promise<ProjectMember> => {
    return put<ProjectMember>(`/user/project-members/${memberId}`, data)
  },

  remove: async (memberId: string | number): Promise<void> => {
    return del<void>(`/user/project-members/${memberId}`)
  },
}
