import { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Button,
  Space,
  message,
  Row,
  Col,
  Upload,
  Checkbox,
  Typography,
} from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { productionService } from '@/services/production'
import { permissionService } from '@/services/permission'
import type { ProductionApproval, CreateProductionApprovalRequest, UpdateProductionApprovalRequest, File as FileType } from '@/types'
import type { UploadFile } from 'antd'

const { TextArea } = Input
const { Text } = Typography

interface ApprovalAuditModalProps {
  projectId: string | number
  visible: boolean
  approval?: ProductionApproval | null
  isEditMode?: boolean
  onCancel: () => void
  onSuccess: () => void
}

export const ApprovalAuditModal = ({
  projectId,
  visible,
  approval,
  isEditMode = false,
  onCancel,
  onSuccess,
}: ApprovalAuditModalProps) => {
  const [form] = Form.useForm()
  const [approvalFileList, setApprovalFileList] = useState<UploadFile[]>([])
  const [auditFileList, setAuditFileList] = useState<UploadFile[]>([])
  const [useContractAmountApproval, setUseContractAmountApproval] = useState(false)
  const [useContractAmountAudit, setUseContractAmountAudit] = useState(false)
  const [amountManuallyChangedApproval, setAmountManuallyChangedApproval] = useState(false)
  const [amountManuallyChangedAudit, setAmountManuallyChangedAudit] = useState(false)
  const queryClient = useQueryClient()

  // 检查权限
  const { data: canManage = false } = useQuery({
    queryKey: ['canManageProductionInfo', projectId],
    queryFn: () => permissionService.canManageProductionInfo(projectId),
    enabled: !!projectId && visible,
  })

  // 获取合同金额（用于引用）
  const { data: contractAmounts } = useQuery({
    queryKey: ['contractAmounts', projectId],
    queryFn: () => productionService.getContractAmounts(projectId),
    enabled: !!projectId && visible,
  })

  // 获取批复和审计信息（用于审计金额引用批复金额）
  const { data: approvalAndAudit } = useQuery({
    queryKey: ['approvalAndAudit', projectId],
    queryFn: () => productionService.getApprovalAndAudit(projectId),
    enabled: !!projectId && visible,
  })

  const approvalData = approvalAndAudit?.approval || null
  
  // 获取可用的批复金额数据（从API或表单中获取）
  // 在表单中，如果用户先填写了批复金额，审计金额应该可以引用
  const getAvailableApprovalData = () => {
    // 优先使用API返回的批复数据
    if (approvalData) {
      return approvalData
    }
    // 如果API没有数据，尝试从表单中获取
    const design = form.getFieldValue('approval_amount_design') || 0
    const survey = form.getFieldValue('approval_amount_survey') || 0
    const consulting = form.getFieldValue('approval_amount_consulting') || 0
    if (design > 0 || survey > 0 || consulting > 0) {
      return { amount_design: design, amount_survey: survey, amount_consulting: consulting }
    }
    return null
  }

  // 初始化表单数据
  useEffect(() => {
    if (visible) {
      if (isEditMode && approvalAndAudit) {
        // 编辑模式：从 API 获取的完整数据填充表单
        const approvalData = approvalAndAudit.approval
        const auditData = approvalAndAudit.audit

        // 填充批复数据
        if (approvalData) {
          form.setFieldsValue({
            approval_amount_design: approvalData.amount_design,
            approval_amount_survey: approvalData.amount_survey,
            approval_amount_consulting: approvalData.amount_consulting,
            approval_override_reason: approvalData.override_reason,
            approval_remarks: approvalData.remarks,
          })

          // 设置批复文件列表
          if (approvalData.report_file) {
            setApprovalFileList([{
              uid: approvalData.report_file.id,
              name: approvalData.report_file.original_name,
              status: 'done',
              url: undefined,
            }])
          }

          // 检查是否引用了合同金额
          if (approvalData.source_contract_id) {
            setUseContractAmountApproval(true)
          }
        }

        // 填充审计数据
        if (auditData) {
          form.setFieldsValue({
            audit_amount_design: auditData.amount_design,
            audit_amount_survey: auditData.amount_survey,
            audit_amount_consulting: auditData.amount_consulting,
            audit_override_reason: auditData.override_reason,
            audit_remarks: auditData.remarks,
          })

          // 设置审计文件列表
          if (auditData.report_file) {
            setAuditFileList([{
              uid: auditData.report_file.id,
              name: auditData.report_file.original_name,
              status: 'done',
              url: undefined,
            }])
          }

          // 检查是否引用了批复金额
          if (auditData.source_contract_id) {
            setUseContractAmountAudit(true)
          }
        }
      } else {
        // 新建模式：重置表单
        form.resetFields()
        setApprovalFileList([])
        setAuditFileList([])
        setUseContractAmountApproval(false)
        setUseContractAmountAudit(false)
        setAmountManuallyChangedApproval(false)
        setAmountManuallyChangedAudit(false)
      }
    }
  }, [visible, isEditMode, approvalAndAudit, form])

  // 计算合计金额
  const calculateTotal = (type: 'approval' | 'audit') => {
    const design = form.getFieldValue(`${type}_amount_design`) || 0
    const survey = form.getFieldValue(`${type}_amount_survey`) || 0
    const consulting = form.getFieldValue(`${type}_amount_consulting`) || 0
    return design + survey + consulting
  }

  // 格式化金额
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // 处理文件上传（不立即上传，在保存时触发）
  const handleFileChange = (type: 'approval' | 'audit', info: any) => {
    if (type === 'approval') {
      setApprovalFileList(info.fileList)
    } else {
      setAuditFileList(info.fileList)
    }
  }

  const beforeUpload = () => false // 阻止自动上传

  // 引用合同金额（批复用）
  const handleUseContractAmount = (type: 'approval' | 'audit', checked: boolean) => {
    if (type === 'approval') {
      // 批复金额引用合同金额
      if (checked && contractAmounts) {
        form.setFieldsValue({
          approval_amount_design: contractAmounts.design_fee,
          approval_amount_survey: contractAmounts.survey_fee,
          approval_amount_consulting: contractAmounts.consultation_fee,
        })
        setUseContractAmountApproval(true)
        setAmountManuallyChangedApproval(false) // 引用合同金额时，重置手动修改标记
      } else {
        setUseContractAmountApproval(false)
      }
    } else {
      // 审计金额引用批复金额（可以从API或表单中获取）
      const availableApprovalData = getAvailableApprovalData()
      if (checked && availableApprovalData) {
        form.setFieldsValue({
          audit_amount_design: availableApprovalData.amount_design,
          audit_amount_survey: availableApprovalData.amount_survey,
          audit_amount_consulting: availableApprovalData.amount_consulting,
        })
        setUseContractAmountAudit(true)
        setAmountManuallyChangedAudit(false) // 引用批复金额时，重置手动修改标记
      } else {
        setUseContractAmountAudit(false)
      }
    }
  }

  // 处理金额手动修改
  const handleAmountChange = (type: 'approval' | 'audit') => {
    // 如果之前引用了合同/批复金额，现在手动修改了，标记为手动修改
    if (type === 'approval' && useContractAmountApproval) {
      setAmountManuallyChangedApproval(true)
    } else if (type === 'audit' && useContractAmountAudit) {
      setAmountManuallyChangedAudit(true)
    } else {
      // 如果没有引用，但手动输入了金额，也标记为手动修改（用于显示覆盖原因说明）
      const design = form.getFieldValue(`${type}_amount_design`) || 0
      const survey = form.getFieldValue(`${type}_amount_survey`) || 0
      const consulting = form.getFieldValue(`${type}_amount_consulting`) || 0
      if (design > 0 || survey > 0 || consulting > 0) {
        if (type === 'approval') {
          setAmountManuallyChangedApproval(true)
        } else {
          setAmountManuallyChangedAudit(true)
        }
      }
    }
    // 更新合计
    form.setFieldsValue({ [`${type}_total`]: calculateTotal(type) })
  }

  // 创建批复审计信息
  const createMutation = useMutation({
    mutationFn: async (data: CreateProductionApprovalRequest) => {
      // 先上传文件（如果有）
      let reportFileId: string | undefined
      if (data.approval_type === 'approval' && approvalFileList.length > 0) {
        const file = approvalFileList[0].originFileObj
        if (file) {
          const uploadedFile: FileType = await productionService.uploadReportFile(projectId, file, 'approval')
          reportFileId = uploadedFile.id
        }
      } else if (data.approval_type === 'audit' && auditFileList.length > 0) {
        const file = auditFileList[0].originFileObj
        if (file) {
          const uploadedFile: FileType = await productionService.uploadReportFile(projectId, file, 'audit')
          reportFileId = uploadedFile.id
        }
      }

      return productionService.createProductionApproval(projectId, {
        ...data,
        report_file_id: reportFileId,
      })
    },
    onSuccess: () => {
      message.success('保存成功')
      queryClient.invalidateQueries({ queryKey: ['approvalAndAudit', projectId] })
      onSuccess()
    },
    onError: (error: any) => {
      message.error(error?.message || '保存失败')
    },
  })

  // 更新批复审计信息
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProductionApprovalRequest }) => {
      // 先上传文件（如果有新文件）
      let reportFileId: string | undefined = data.report_file_id
      if (data.approval_type === 'approval' && approvalFileList.length > 0) {
        const file = approvalFileList[0].originFileObj
        if (file) {
          const uploadedFile: FileType = await productionService.uploadReportFile(projectId, file, 'approval')
          reportFileId = uploadedFile.id
        }
      } else if (data.approval_type === 'audit' && auditFileList.length > 0) {
        const file = auditFileList[0].originFileObj
        if (file) {
          const uploadedFile: FileType = await productionService.uploadReportFile(projectId, file, 'audit')
          reportFileId = uploadedFile.id
        }
      }

      return productionService.updateProductionApproval(id, {
        ...data,
        report_file_id: reportFileId,
      })
    },
    onSuccess: () => {
      message.success('更新成功')
      queryClient.invalidateQueries({ queryKey: ['approvalAndAudit', projectId] })
      onSuccess()
    },
    onError: (error: any) => {
      message.error(error?.message || '更新失败')
    },
  })

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      // 分别处理批复和审计
      // 批复
      if (values.approval_amount_design !== undefined || values.approval_amount_survey !== undefined || values.approval_amount_consulting !== undefined || approvalFileList.length > 0) {
        const approvalData: CreateProductionApprovalRequest = {
          approval_type: 'approval',
          amount_design: values.approval_amount_design ?? 0,
          amount_survey: values.approval_amount_survey ?? 0,
          amount_consulting: values.approval_amount_consulting ?? 0,
          use_contract_amount: useContractAmountApproval || false,
          override_reason: values.approval_override_reason || '',
          remarks: values.approval_remarks || '',
        }

        if (isEditMode && approvalAndAudit?.approval) {
          await updateMutation.mutateAsync({ id: approvalAndAudit.approval.id, data: approvalData })
        } else {
          await createMutation.mutateAsync(approvalData)
        }
      }

      // 审计
      if (values.audit_amount_design !== undefined || values.audit_amount_survey !== undefined || values.audit_amount_consulting !== undefined || auditFileList.length > 0) {
        const auditData: CreateProductionApprovalRequest = {
          approval_type: 'audit',
          amount_design: values.audit_amount_design ?? 0,
          amount_survey: values.audit_amount_survey ?? 0,
          amount_consulting: values.audit_amount_consulting ?? 0,
          use_contract_amount: useContractAmountAudit || false,
          override_reason: values.audit_override_reason || '',
          remarks: values.audit_remarks || '',
        }

        if (isEditMode && approvalAndAudit?.audit) {
          await updateMutation.mutateAsync({ id: approvalAndAudit.audit.id, data: auditData })
        } else {
          await createMutation.mutateAsync(auditData)
        }
      }

      message.success('保存成功')
      onSuccess()
    } catch (error: any) {
      if (error?.errorFields) {
        // 表单验证错误
        return
      }
      message.error(error?.message || '保存失败')
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <Modal
      title={isEditMode ? '编辑批复审计信息' : '新建批复审计信息'}
      open={visible}
      onCancel={onCancel}
      width={1000}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={isSubmitting}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleSubmit}
          loading={isSubmitting}
          disabled={!canManage}
        >
          保存
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" disabled={!canManage}>
        <Row gutter={20}>
          {/* 批复列 */}
          <Col span={12}>
            <div style={{ border: '1px solid #d9d9d9', padding: '16px', borderRadius: '4px', background: '#fafafa' }}>
              <Text strong style={{ fontSize: '16px', marginBottom: '16px', display: 'block' }}>
                批复
              </Text>

              {/* 批复报告 */}
              <Form.Item label="批复报告" style={{ marginBottom: '16px' }}>
                <Upload
                  fileList={approvalFileList}
                  onChange={(info) => handleFileChange('approval', info)}
                  beforeUpload={beforeUpload}
                  maxCount={1}
                  disabled={!canManage}
                >
                  <Button icon={<UploadOutlined />} disabled={!canManage}>
                    选择文件
                  </Button>
                </Upload>
                <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
                  文件选择后将在保存时上传
                </div>
              </Form.Item>

              {/* 批复金额 */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong>批复金额</Text>
                  <Checkbox
                    checked={useContractAmountApproval}
                    onChange={(e) => handleUseContractAmount('approval', e.target.checked)}
                    disabled={!canManage || !contractAmounts}
                  >
                    引用合同金额
                  </Checkbox>
                </div>

                <Form.Item
                  name="approval_amount_design"
                  label="设计费（元）"
                  rules={[{ type: 'number', min: 0, message: '金额不能为负数' }]}
                >
                  <InputNumber
                    min={0}
                    precision={2}
                    style={{ width: '100%' }}
                    placeholder="请输入设计费"
                    disabled={!canManage || useContractAmountApproval}
                    onChange={() => handleAmountChange('approval')}
                  />
                </Form.Item>

                <Form.Item
                  name="approval_amount_survey"
                  label="勘察费（元）"
                  rules={[{ type: 'number', min: 0, message: '金额不能为负数' }]}
                >
                  <InputNumber
                    min={0}
                    precision={2}
                    style={{ width: '100%' }}
                    placeholder="请输入勘察费"
                    disabled={!canManage || useContractAmountApproval}
                    onChange={() => handleAmountChange('approval')}
                  />
                </Form.Item>

                <Form.Item
                  name="approval_amount_consulting"
                  label="咨询费（元）"
                  rules={[{ type: 'number', min: 0, message: '金额不能为负数' }]}
                >
                  <InputNumber
                    min={0}
                    precision={2}
                    style={{ width: '100%' }}
                    placeholder="请输入咨询费"
                    disabled={!canManage || useContractAmountApproval}
                    onChange={() => handleAmountChange('approval')}
                  />
                </Form.Item>

                <div style={{ marginTop: '8px', padding: '8px', background: '#f0f0f0', borderRadius: '4px' }}>
                  <Text strong>合计: {formatAmount(calculateTotal('approval'))}</Text>
                </div>

                {/* 如果手动修改了金额（不管是否引用合同金额），都显示覆盖原因说明 */}
                {amountManuallyChangedApproval && (
                  <Form.Item
                    name="approval_override_reason"
                    label="覆盖原因说明"
                  >
                    <TextArea
                      rows={3}
                      placeholder={useContractAmountApproval ? "请说明为什么需要覆盖合同金额（可选）" : "请说明金额来源或调整原因（可选）"}
                      disabled={!canManage}
                    />
                  </Form.Item>
                )}
              </div>

              <Form.Item name="approval_remarks" label="备注">
                <TextArea
                  rows={3}
                  placeholder="请输入备注信息（可选）"
                  disabled={!canManage}
                />
              </Form.Item>
            </div>
          </Col>

          {/* 审计列 */}
          <Col span={12}>
            <div style={{ border: '1px solid #d9d9d9', padding: '16px', borderRadius: '4px', background: '#fafafa' }}>
              <Text strong style={{ fontSize: '16px', marginBottom: '16px', display: 'block' }}>
                审计
              </Text>

              {/* 审计报告 */}
              <Form.Item label="审计报告" style={{ marginBottom: '16px' }}>
                <Upload
                  fileList={auditFileList}
                  onChange={(info) => handleFileChange('audit', info)}
                  beforeUpload={beforeUpload}
                  maxCount={1}
                  disabled={!canManage}
                >
                  <Button icon={<UploadOutlined />} disabled={!canManage}>
                    选择文件
                  </Button>
                </Upload>
                <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
                  文件选择后将在保存时上传
                </div>
              </Form.Item>

              {/* 审计金额 */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong>审计金额</Text>
                  <Checkbox
                    checked={useContractAmountAudit}
                    onChange={(e) => handleUseContractAmount('audit', e.target.checked)}
                    disabled={!canManage || !getAvailableApprovalData()}
                  >
                    引用批复金额
                  </Checkbox>
                </div>

                <Form.Item
                  name="audit_amount_design"
                  label="设计费（元）"
                  rules={[{ type: 'number', min: 0, message: '金额不能为负数' }]}
                >
                  <InputNumber
                    min={0}
                    precision={2}
                    style={{ width: '100%' }}
                    placeholder="请输入设计费"
                    disabled={!canManage || useContractAmountAudit}
                    onChange={() => handleAmountChange('audit')}
                  />
                </Form.Item>

                <Form.Item
                  name="audit_amount_survey"
                  label="勘察费（元）"
                  rules={[{ type: 'number', min: 0, message: '金额不能为负数' }]}
                >
                  <InputNumber
                    min={0}
                    precision={2}
                    style={{ width: '100%' }}
                    placeholder="请输入勘察费"
                    disabled={!canManage || useContractAmountAudit}
                    onChange={() => handleAmountChange('audit')}
                  />
                </Form.Item>

                <Form.Item
                  name="audit_amount_consulting"
                  label="咨询费（元）"
                  rules={[{ type: 'number', min: 0, message: '金额不能为负数' }]}
                >
                  <InputNumber
                    min={0}
                    precision={2}
                    style={{ width: '100%' }}
                    placeholder="请输入咨询费"
                    disabled={!canManage || useContractAmountAudit}
                    onChange={() => handleAmountChange('audit')}
                  />
                </Form.Item>

                <div style={{ marginTop: '8px', padding: '8px', background: '#f0f0f0', borderRadius: '4px' }}>
                  <Text strong>合计: {formatAmount(calculateTotal('audit'))}</Text>
                </div>

                {/* 如果手动修改了金额（不管是否引用批复金额），都显示覆盖原因说明 */}
                {amountManuallyChangedAudit && (
                  <Form.Item
                    name="audit_override_reason"
                    label="覆盖原因说明"
                  >
                    <TextArea
                      rows={3}
                      placeholder={useContractAmountAudit ? "请说明为什么需要覆盖批复金额（可选）" : "请说明金额来源或调整原因（可选）"}
                      disabled={!canManage}
                    />
                  </Form.Item>
                )}
              </div>

              <Form.Item name="audit_remarks" label="备注">
                <TextArea
                  rows={3}
                  placeholder="请输入备注信息（可选）"
                  disabled={!canManage}
                />
              </Form.Item>
            </div>
          </Col>
        </Row>
      </Form>
    </Modal>
  )
}

