import { useEffect } from 'react'
import {
  Modal,
  Form,
  InputNumber,
  Button,
  message,
  Typography,
} from 'antd'
import { useMutation } from '@tanstack/react-query'
import { productionService } from '@/services/production'
import { getErrorMessage } from '@/utils/error'

const { Text } = Typography

interface SchemeScoreEditModalProps {
  projectId: string | number
  visible: boolean
  currentScore?: number
  onCancel: () => void
  onSuccess: () => void
}

export const SchemeScoreEditModal = ({
  projectId,
  visible,
  currentScore,
  onCancel,
  onSuccess,
}: SchemeScoreEditModalProps) => {
  const [form] = Form.useForm()

  useEffect(() => {
    if (visible) {
      form.setFieldsValue({
        score: currentScore,
      })
    }
  }, [visible, currentScore, form])

  const updateMutation = useMutation({
    mutationFn: async (score: number) => {
      await productionService.updateStageScore(projectId, 'scheme', score)
    },
    onSuccess: () => {
      message.success('更新评分成功')
      form.resetFields()
      onSuccess()
    },
    onError: (error: any) => {
      message.error(getErrorMessage(error, '更新评分失败'))
    },
  })

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      await updateMutation.mutateAsync(values.score)
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    onCancel()
  }

  return (
    <Modal
      title="编辑评分"
      open={visible}
      onCancel={handleCancel}
      onOk={handleSubmit}
      confirmLoading={updateMutation.isPending}
      width={400}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="score"
          label={
            <>
              评分 <Text type="danger">*</Text>
            </>
          }
          rules={[
            { required: true, message: '请输入评分' },
            { type: 'number', min: 0, max: 100, message: '评分必须在0-100之间' },
          ]}
        >
          <InputNumber
            placeholder="请输入评分（0-100）"
            min={0}
            max={100}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          请输入0-100之间的分数
        </Text>
      </Form>
    </Modal>
  )
}

