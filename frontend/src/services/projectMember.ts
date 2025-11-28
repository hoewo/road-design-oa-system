import { get, post, put, del } from './api'
import type { ProjectMember, MemberRole } from '@/types'

export interface CreateProjectMemberPayload {
  user_id: number
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
  list: async (projectId: number): Promise<ProjectMember[]> => {
    return get<ProjectMember[]>(`/projects/${projectId}/members`)
  },

  create: async (
    projectId: number,
    data: CreateProjectMemberPayload
  ): Promise<ProjectMember> => {
    return post<ProjectMember>(`/projects/${projectId}/members`, data)
  },

  update: async (
    memberId: number,
    data: UpdateProjectMemberPayload
  ): Promise<ProjectMember> => {
    return put<ProjectMember>(`/project-members/${memberId}`, data)
  },

  remove: async (memberId: number): Promise<void> => {
    return del<void>(`/project-members/${memberId}`)
  },
}
