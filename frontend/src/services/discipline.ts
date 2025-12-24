import { get, post, put, del } from './api'
import type { Discipline, CreateDisciplineRequest, UpdateDisciplineRequest } from '@/types'

export const disciplineService = {
  // 获取专业列表
  listDisciplines: async (includeInactive = false): Promise<Discipline[]> => {
    const response = await get<Discipline[]>(
      `/user/disciplines?include_inactive=${includeInactive}`
    )
    return Array.isArray(response) ? response : []
  },

  // 获取专业详情
  getDiscipline: async (id: string): Promise<Discipline> => {
    const response = await get<Discipline>(
      `/user/disciplines/${id}`
    )
    return response
  },

  // 创建专业
  createDiscipline: async (data: CreateDisciplineRequest): Promise<Discipline> => {
    const response = await post<Discipline>(
      `/user/disciplines`,
      data
    )
    return response
  },

  // 更新专业
  updateDiscipline: async (id: string, data: UpdateDisciplineRequest): Promise<Discipline> => {
    const response = await put<Discipline>(
      `/user/disciplines/${id}`,
      data
    )
    return response
  },

  // 删除专业（软删除）
  deleteDiscipline: async (id: string): Promise<void> => {
    await del(`/user/disciplines/${id}`)
  },
}

