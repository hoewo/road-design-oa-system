import { Select } from 'antd'
import type { User } from '@/types'

const { Option } = Select

interface ManagerSelectorProps {
  users: User[]
  value?: string
  onChange?: (value: string | null) => void
  placeholder?: string
  disabled?: boolean
}

export const ManagerSelector = ({
  users,
  value,
  onChange,
  placeholder = '请选择负责人',
  disabled = false,
}: ManagerSelectorProps) => {
  return (
    <Select
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      allowClear
      showSearch
      disabled={disabled}
      filterOption={(input, option) => {
        const label = option?.label || option?.children
        return String(label || '')
          .toLowerCase()
          .includes(input.toLowerCase())
      }}
      style={{ width: '100%' }}
    >
      {users.map((user) => (
        <Option key={user.id} value={user.id}>
          {user.real_name || user.username}
        </Option>
      ))}
    </Select>
  )
}

