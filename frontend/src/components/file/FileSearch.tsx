import { Form, Select, DatePicker, Input, Button, Space } from 'antd'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import type { FileCategory } from '@/types'
import dayjs, { Dayjs } from 'dayjs'

const { RangePicker } = DatePicker

interface FileSearchProps {
  onSearch: (params: {
    project_id?: string
    category?: FileCategory
    file_type?: string
    start_date?: string
    end_date?: string
    keyword?: string
  }) => void
  onReset: () => void
  projects?: Array<{ id: string; name: string }>
}

const FILE_CATEGORY_OPTIONS = [
  { label: '全部类型', value: '' },
  // 合同相关
  { label: '主合同文件', value: 'contract_main' as FileCategory },
  { label: '补充协议文件', value: 'contract_amendment' as FileCategory },
  { label: '外委合同文件', value: 'contract_external' as FileCategory },
  // 招投标相关
  { label: '招标文件', value: 'tender' as FileCategory },
  { label: '投标文件', value: 'bid' as FileCategory },
  { label: '中标通知书', value: 'award_notice' as FileCategory },
  // 生产相关
  { label: '方案PPT', value: 'scheme_ppt' as FileCategory },
  { label: '初步设计', value: 'preliminary_design' as FileCategory },
  { label: '施工图设计', value: 'construction_drawing' as FileCategory },
  { label: '变更洽商', value: 'variation_order' as FileCategory },
  { label: '竣工验收', value: 'completion_report' as FileCategory },
  { label: '审计报告', value: 'audit_report' as FileCategory },
  // 其他
  { label: '发票文件', value: 'invoice' as FileCategory },
]

export const FileSearch = ({ onSearch, onReset, projects }: FileSearchProps) => {
  const [form] = Form.useForm()

  const handleSearch = () => {
    const values = form.getFieldsValue()
    const params: any = {}

    if (values.project_id) {
      params.project_id = values.project_id
    }
    if (values.category) {
      params.category = values.category
    }
    if (values.file_type) {
      params.file_type = values.file_type
    }
    if (values.dateRange && values.dateRange.length === 2) {
      params.start_date = values.dateRange[0].format('YYYY-MM-DD')
      params.end_date = values.dateRange[1].format('YYYY-MM-DD')
    }
    if (values.keyword) {
      params.keyword = values.keyword
    }

    onSearch(params)
  }

  const handleReset = () => {
    form.resetFields()
    onReset()
  }

  return (
    <Form form={form} layout="inline" style={{ marginBottom: 16 }}>
      <Form.Item name="keyword">
        <Input placeholder="搜索文件名..." style={{ width: 300 }} />
      </Form.Item>

      <Form.Item name="project_id">
        <Select
          placeholder="全部项目"
          style={{ width: 200 }}
          allowClear
          showSearch
          optionFilterProp="children"
        >
          {projects?.map((project) => (
            <Select.Option key={project.id} value={project.id}>
              {project.name}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item name="category">
        <Select placeholder="全部类型" style={{ width: 150 }} allowClear>
          {FILE_CATEGORY_OPTIONS.map((option) => (
            <Select.Option key={option.value || 'all'} value={option.value || undefined}>
              {option.label}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item name="dateRange">
        <RangePicker placeholder={['开始日期', '结束日期']} />
      </Form.Item>

      <Form.Item>
        <Space>
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
        </Space>
      </Form.Item>
    </Form>
  )
}

