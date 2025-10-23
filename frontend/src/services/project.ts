import { get, post, put, del, getPaginated } from './api'
import type { 
  Project, 
  Client, 
  CreateProjectRequest, 
  UpdateProjectRequest, 
  CreateClientRequest,
  PaginatedResponse 
} from '@/types'

export const projectService = {
  // Project CRUD operations
  getProjects: async (params?: {
    page?: number
    size?: number
    status?: string
    keyword?: string
  }): Promise<PaginatedResponse<Project>> => {
    return getPaginated<Project>('/projects', params)
  },

  getProject: async (id: number): Promise<Project> => {
    return get<Project>(`/projects/${id}`)
  },

  createProject: async (data: CreateProjectRequest): Promise<Project> => {
    return post<Project>('/projects', data)
  },

  updateProject: async (id: number, data: UpdateProjectRequest): Promise<Project> => {
    return put<Project>(`/projects/${id}`, data)
  },

  deleteProject: async (id: number): Promise<void> => {
    return del<void>(`/projects/${id}`)
  },

  // Client CRUD operations
  getClients: async (params?: {
    page?: number
    size?: number
    keyword?: string
  }): Promise<PaginatedResponse<Client>> => {
    return getPaginated<Client>('/clients', params)
  },

  getClient: async (id: number): Promise<Client> => {
    return get<Client>(`/clients/${id}`)
  },

  createClient: async (data: CreateClientRequest): Promise<Client> => {
    return post<Client>('/clients', data)
  },

  updateClient: async (id: number, data: Partial<CreateClientRequest>): Promise<Client> => {
    return put<Client>(`/clients/${id}`, data)
  },

  deleteClient: async (id: number): Promise<void> => {
    return del<void>(`/clients/${id}`)
  },
}
