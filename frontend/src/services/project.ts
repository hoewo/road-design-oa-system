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

  getProject: async (id: number): Promise<Project> => {
    return get<Project>(`/user/projects/${id}`)
  },

  createProject: async (data: CreateProjectRequest): Promise<Project> => {
    return post<Project>('/user/projects', data)
  },

  updateProject: async (
    id: number,
    data: UpdateProjectRequest
  ): Promise<Project> => {
    return put<Project>(`/user/projects/${id}`, data)
  },

  deleteProject: async (id: number): Promise<void> => {
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

  getClient: async (id: number): Promise<Client> => {
    return get<Client>(`/user/clients/${id}`)
  },

  createClient: async (data: CreateClientRequest): Promise<Client> => {
    return post<Client>('/user/clients', data)
  },

  updateClient: async (
    id: number,
    data: Partial<CreateClientRequest>
  ): Promise<Client> => {
    return put<Client>(`/user/clients/${id}`, data)
  },

  deleteClient: async (id: number): Promise<void> => {
    return del<void>(`/user/clients/${id}`)
  },
}
