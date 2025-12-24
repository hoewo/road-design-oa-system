import { useState } from 'react'
import { Select, Button, Space, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { disciplineService } from '@/services/discipline'
import { DisciplineManageModal } from './DisciplineManageModal'
import type { Discipline } from '@/types'

const { Option } = Select

interface DisciplineSelectorProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  allowManage?: boolean // 是否允许管理专业（新增、编辑、删除）
  onDisciplineChange?: (discipline: Discipline | null) => void
}

export const DisciplineSelector = ({
  value,
  onChange,
  placeholder = '请选择专业',
  allowManage = true,
  onDisciplineChange,
}: DisciplineSelectorProps) => {
  const [manageModalVisible, setManageModalVisible] = useState(false)
  const [editingDiscipline, setEditingDiscipline] = useState<Discipline | null>(null)
  const queryClient = useQueryClient()

  // 获取专业列表
  const { data: disciplines = [] } = useQuery({
    queryKey: ['disciplines', { includeInactive: false }],
    queryFn: () => disciplineService.listDisciplines(false),
  })

  const handleSelectChange = (selectedValue: string) => {
    onChange?.(selectedValue)
    const discipline = disciplines.find((d) => d.id === selectedValue) || null
    onDisciplineChange?.(discipline)
  }

  const handleAdd = () => {
    setEditingDiscipline(null)
    setManageModalVisible(true)
  }

  const handleEdit = () => {
    if (!value) {
      message.warning('请先选择专业')
      return
    }
    const discipline = disciplines.find((d) => d.id === value)
    if (discipline) {
      setEditingDiscipline(discipline)
      setManageModalVisible(true)
    }
  }

  const handleDelete = async () => {
    if (!value) {
      message.warning('请先选择专业')
      return
    }
    try {
      await disciplineService.deleteDiscipline(value)
      message.success('删除专业成功')
      // 使查询缓存失效，触发重新获取
      queryClient.invalidateQueries({
        queryKey: ['disciplines'],
      })
      onChange?.(undefined as any)
      onDisciplineChange?.(null)
    } catch (error: any) {
      message.error(error.message || '删除专业失败')
    }
  }

  const handleManageSuccess = () => {
    // 使查询缓存失效，触发重新获取
    queryClient.invalidateQueries({
      queryKey: ['disciplines'],
    })
    setManageModalVisible(false)
    setEditingDiscipline(null)
  }

  return (
    <>
      <Space.Compact style={{ width: '100%' }}>
        <Select
          value={value}
          onChange={handleSelectChange}
          placeholder={placeholder}
          style={{ flex: 1 }}
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={disciplines.map((d) => ({
            label: d.name,
            value: d.id,
          }))}
        />
        {allowManage && (
          <>
            <Button icon={<PlusOutlined />} onClick={handleAdd} title="新增专业" />
            <Button
              icon={<EditOutlined />}
              onClick={handleEdit}
              disabled={!value}
              title="编辑专业"
            />
            <Button
              icon={<DeleteOutlined />}
              onClick={handleDelete}
              disabled={!value}
              danger
              title="删除专业"
            />
          </>
        )}
      </Space.Compact>

      <DisciplineManageModal
        visible={manageModalVisible}
        discipline={editingDiscipline}
        onCancel={() => {
          setManageModalVisible(false)
          setEditingDiscipline(null)
        }}
        onSuccess={handleManageSuccess}
      />
    </>
  )
}

