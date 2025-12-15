import { get, post, put, del, getPaginated } from './api'
import type {
  Project,
  Client,
  CreateProjectRequest,
  UpdateProjectRequest,
  CreateClientRequest,
  PaginatedResponse,
} from '@/types'

export const projectService = {
  // Project CRUD operations
  getProjects: async (params?: {
    page?: number
    size?: number
    status?: string
    keyword?: string
  }): Promise<PaginatedResponse<Project>> => {
    return getPaginated<Project>('/user/projects', params)
  },

  getProject: async (id: string | number): Promise<Project> => {
    return get<Project>(`/user/projects/${id}`)
  },

  createProject: async (data: CreateProjectRequest): Promise<Project> => {
    return post<Project>('/user/projects', data)
  },

  updateProject: async (
    id: string | number,
    data: UpdateProjectRequest
  ): Promise<Project> => {
    return put<Project>(`/user/projects/${id}`, data)
  },

  deleteProject: async (id: string | number): Promise<void> => {
    return del<void>(`/user/projects/${id}`)
  },

  // Client CRUD operations
  getClients: async (params?: {
    page?: number
    size?: number
    keyword?: string
  }): Promise<PaginatedResponse<Client>> => {
    return getPaginated<Client>('/user/clients', params)
  },

  getClient: async (id: string | number): Promise<Client> => {
    return get<Client>(`/user/clients/${id}`)
  },

  createClient: async (data: CreateClientRequest, projectId?: string | number): Promise<Client> => {
    const params = projectId ? { project_id: projectId } : undefined
    return post<Client>('/user/clients', data, params)
  },

  updateClient: async (
    id: string | number,
    data: Partial<CreateClientRequest>,
    projectId?: string | number
  ): Promise<Client> => {
    const params = projectId ? { project_id: projectId } : undefined
    return put<Client>(`/user/clients/${id}`, data, params)
  },

  deleteClient: async (id: string | number): Promise<void> => {
    return del<void>(`/user/clients/${id}`)
  },
}
