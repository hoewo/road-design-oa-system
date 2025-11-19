import { useState, useEffect } from 'react'
import {
  Form,
  Input,
  DatePicker,
  Select,
  Button,
  Space,
  message,
  Row,
  Col,
} from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { projectService } from '@/services/project'
import type {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectStatus,
} from '@/types'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Option } = Select

interface ProjectFormProps {
  projectId?: number
  onSuccess?: () => void
  onCancel?: () => void
}

const ProjectForm = ({ projectId, onSuccess, onCancel }: ProjectFormProps) => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const [managers, setManagers] = useState<any[]>([])

  // Load project data if editing
  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.getProject(projectId!),
    enabled: !!projectId,
  })

  // Set form values when project is loaded
  useEffect(() => {
    if (project) {
      form.setFieldsValue({
        project_name: project.project_name,
        project_number: project.project_number,
        start_date: dayjs(project.start_date),
        project_overview: project.project_overview,
        drawing_unit: project.drawing_unit,
        manager_id: project.manager_id,
        status: project.status,
      })
    }
  }, [project, form])

  // Create project mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateProjectRequest) =>
      projectService.createProject(data),
    onSuccess: () => {
      message.success('项目创建成功')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      form.resetFields()
      onSuccess?.()
    },
    onError: (error: any) => {
      message.error(error?.message || '项目创建失败')
    },
  })

  // Update project mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProjectRequest }) =>
      projectService.updateProject(id, data),
    onSuccess: () => {
      message.success('项目更新成功')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      onSuccess?.()
    },
    onError: (error: any) => {
      message.error(error?.message || '项目更新失败')
    },
  })


  const handleSubmit = async (values: any) => {
    if (projectId) {
      // Update existing project
      const updateData: UpdateProjectRequest = {
        project_name: values.project_name,
        project_overview: values.project_overview,
        drawing_unit: values.drawing_unit,
        status: values.status,
      }
      if (values.start_date) {
        updateData.start_date = values.start_date.format('YYYY-MM-DD')
      }

      updateMutation.mutate({ id: projectId, data: updateData })
    } else {
      // Create new project - Note: client_id is NOT included as it's managed in business information module
      const createData: CreateProjectRequest = {
        project_name: values.project_name,
        project_number: values.project_number,
      }
      // Add optional fields only if they have values
      if (values.project_overview) {
        createData.project_overview = values.project_overview
      }
      if (values.drawing_unit) {
        createData.drawing_unit = values.drawing_unit
      }
      if (values.start_date) {
        createData.start_date = values.start_date.format('YYYY-MM-DD')
      }
      if (values.manager_id) {
        createData.manager_id = values.manager_id
      }
      createMutation.mutate(createData)
    }
  }

  if (loadingProject) {
    return <div>加载中...</div>
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        status: 'planning',
      }}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="project_name"
            label="项目名称"
            rules={[{ required: true, message: '请输入项目名称' }]}
          >
            <Input placeholder="请输入项目名称" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="project_number"
            label="项目编号"
            rules={[{ required: !projectId, message: '请输入项目编号' }]}
          >
            <Input placeholder="请输入项目编号" disabled={!!projectId} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="start_date" label="承接日期">
            <DatePicker
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              placeholder="请选择承接日期（可选）"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="status" label="项目状态">
            <Select placeholder="请选择项目状态（可选）">
              <Option value="planning">规划中</Option>
              <Option value="bidding">招投标</Option>
              <Option value="contract">合同签订</Option>
              <Option value="production">生产中</Option>
              <Option value="completed">已完成</Option>
              <Option value="cancelled">已取消</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="drawing_unit" label="出图单位">
            <Input placeholder="请输入出图单位（可选）" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="project_overview" label="项目概况">
        <TextArea
          rows={4}
          placeholder="请输入项目概况（可选）"
          maxLength={1000}
          showCount
        />
      </Form.Item>

      <Form.Item>
        <Space>
          <Button
            type="primary"
            htmlType="submit"
            loading={createMutation.isPending || updateMutation.isPending}
          >
            {projectId ? '更新' : '创建'}
          </Button>
          <Button onClick={onCancel || (() => form.resetFields())}>取消</Button>
        </Space>
      </Form.Item>
    </Form>
  )
}

export default ProjectForm
