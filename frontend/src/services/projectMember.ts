import { get, post, put, del } from './api'
import type { ProjectMember, MemberRole } from '@/types'

export interface CreateProjectMemberPayload {
  user_id: string // UUID string
  role: MemberRole
  discipline_id?: string // UUID string, required for production roles
  join_date: string
  leave_date?: string
  is_active?: boolean
}

export interface UpdateProjectMemberPayload {
  role?: MemberRole
  discipline_id?: string // UUID string, required for production roles
  join_date?: string
  leave_date?: string
  is_active?: boolean
}

export const projectMemberService = {
  list: async (
    projectId: string | number,
    params?: { role?: MemberRole; discipline_id?: string }
  ): Promise<ProjectMember[]> => {
    const queryParams = new URLSearchParams()
    if (params?.role) queryParams.append('role', params.role)
    if (params?.discipline_id) queryParams.append('discipline_id', params.discipline_id)
    const queryString = queryParams.toString()
    const url = `/user/projects/${projectId}/members${queryString ? `?${queryString}` : ''}`
    const response = await get<ProjectMember[]>(url)
    return Array.isArray(response) ? response : []
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
