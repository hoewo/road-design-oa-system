import { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Upload,
  InputNumber,
  Button,
  message,
  Typography,
  List,
  Space,
} from 'antd'
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { productionService } from '@/services/production'
import { fileService } from '@/services/file'
import { getErrorMessage } from '@/utils/error'
import type { UploadFile } from 'antd'
import type { StageFileInfo, ProductionFile } from '@/types'
import dayjs from 'dayjs'

const { Text } = Typography

interface SchemeStageEditModalProps {
  projectId: string | number
  visible: boolean
  stageInfo?: StageFileInfo
  onCancel: () => void
  onSuccess: () => void
}

export const SchemeStageEditModal = ({
  projectId,
  visible,
  stageInfo,
  onCancel,
  onSuccess,
}: SchemeStageEditModalProps) => {
  const [form] = Form.useForm()
  const [mainFileList, setMainFileList] = useState<UploadFile[]>([])
  const [reviewSheetFileList, setReviewSheetFileList] = useState<UploadFile[]>([])
  const [uploading, setUploading] = useState(false)
  const queryClient = useQueryClient()

  // 在弹窗内重新获取最新数据（类似 ApprovalAuditModal 的做法）
  const { data: latestStageInfo, isLoading: isLoadingLatest, refetch: refetchLatest } = useQuery<StageFileInfo>({
    queryKey: ['productionFilesByStage', projectId, 'scheme'],
    queryFn: async () => {
      console.log('[SchemeStageEditModal] 开始获取最新数据, projectId:', projectId)
      const data = await productionService.getProductionFilesByStage(projectId, 'scheme')
      console.log('[SchemeStageEditModal] 获取到最新数据:', data)
      return data
    },
    enabled: !!projectId && visible,
  })

  // 使用最新获取的数据，如果没有则使用传入的 stageInfo（向后兼容）
  const currentStageInfo = latestStageInfo || stageInfo
  
  // 日志：数据状态
  useEffect(() => {
    console.log('[SchemeStageEditModal] 数据状态:', {
      visible,
      projectId,
      'latestStageInfo': latestStageInfo,
      'stageInfo (prop)': stageInfo,
      'currentStageInfo': currentStageInfo,
      'isLoadingLatest': isLoadingLatest,
      'mainFiles count': currentStageInfo?.main_files?.length || 0,
      'reviewSheet exists': !!currentStageInfo?.review_sheet,
      'score': currentStageInfo?.score,
    })
  }, [visible, latestStageInfo, stageInfo, currentStageInfo, isLoadingLatest, projectId])

  // 初始化表单数据
  useEffect(() => {
    if (visible && currentStageInfo) {
      form.setFieldsValue({
        score: currentStageInfo.score,
      })
    } else if (visible) {
      form.resetFields()
      setMainFileList([])
      setReviewSheetFileList([])
    }
  }, [visible, currentStageInfo, form])

  // 上传主文件
  const uploadMainFileMutation = useMutation({
    mutationFn: async (params: { file: globalThis.File; reviewSheetFile?: globalThis.File; reviewSheetFileId?: string; score?: number }) => {
      console.log('[SchemeStageEditModal] 开始上传主文件:', {
        fileName: params.file.name,
        hasReviewSheetFile: !!params.reviewSheetFile,
        reviewSheetFileId: params.reviewSheetFileId,
        score: params.score,
      })
      const formData = new FormData()
      formData.append('file', params.file)
      formData.append('file_type', 'scheme_ppt')
      formData.append('stage', 'scheme')
      
      // 如果提供了校审单文件 ID（引用已存在的校审单），优先使用
      if (params.reviewSheetFileId) {
        formData.append('review_sheet_file_id', params.reviewSheetFileId)
        console.log('[SchemeStageEditModal] 使用已存在的校审单文件 ID:', params.reviewSheetFileId)
      } else if (params.reviewSheetFile) {
        // 如果提供了新的校审单文件，上传新文件
        formData.append('review_sheet_file', params.reviewSheetFile)
        console.log('[SchemeStageEditModal] 上传新的校审单文件:', params.reviewSheetFile.name)
      }
      
      // 如果提供了评分，同时传递
      if (params.score !== undefined && params.score !== null) {
        formData.append('score', String(params.score))
        console.log('[SchemeStageEditModal] 同时上传评分:', params.score)
      }
      
      const result = await productionService.uploadProductionFile(projectId, formData)
      console.log('[SchemeStageEditModal] 主文件上传成功:', result)
      return result
    },
    onError: (error: any) => {
      console.error('[SchemeStageEditModal] 主文件上传失败:', error)
      message.error(getErrorMessage(error, '上传失败'))
    },
  })

  // 上传校审单
  const uploadReviewSheetMutation = useMutation({
    mutationFn: async (params: { file: globalThis.File; score?: number; hasPendingMainFiles?: boolean }) => {
      console.log('[SchemeStageEditModal] 开始上传校审单:', {
        fileName: params.file.name,
        score: params.score,
        hasPendingMainFiles: params.hasPendingMainFiles,
      })
      const mainFiles = currentStageInfo?.main_files || []
      const existingReviewSheet = currentStageInfo?.review_sheet
      
      // 先上传校审单文件到文件服务
      const uploadedFile = await fileService.uploadFile(
        String(projectId),
        params.file,
        'audit_report',
        '方案阶段校审单'
      )
      
      // 如果已有校审单记录，更新该记录的 FileID（校审单文件本身）和评分
      if (existingReviewSheet) {
        const updateData: any = {
          file_id: uploadedFile.id,
        }
        if (params.score !== undefined && params.score !== null) {
          updateData.score = params.score
        }
        await productionService.updateProductionFile(projectId, existingReviewSheet.id, updateData)
        console.log('[SchemeStageEditModal] 校审单记录更新成功')
        return { id: uploadedFile.id } as any
      }
      
      // 如果没有校审单记录，创建一个新的校审单记录
      // 校审单记录的 FileID 和 ReviewSheetFileID 都指向校审单文件本身
      // 注意：校审单记录可以独立存在，即使没有主文件也可以创建
      const formData = new FormData()
      formData.append('file', params.file) // 校审单文件作为 FileID
      formData.append('review_sheet_file', params.file) // 校审单文件作为 ReviewSheetFileID
      formData.append('file_type', 'scheme_ppt')
      formData.append('stage', 'scheme')
      if (params.score !== undefined && params.score !== null) {
        formData.append('score', String(params.score))
      }
      const result = await productionService.uploadProductionFile(projectId, formData)
      console.log('[SchemeStageEditModal] 校审单记录创建成功:', result)
      return result
    },
    onError: (error: any) => {
      console.error('[SchemeStageEditModal] 校审单上传失败:', error)
      message.error(getErrorMessage(error, '校审单上传失败'))
    },
  })

  // 更新评分
  const updateScoreMutation = useMutation({
    mutationFn: async (score: number) => {
      console.log('[SchemeStageEditModal] 开始更新评分:', score)
      const result = await productionService.updateStageScore(projectId, 'scheme', score)
      console.log('[SchemeStageEditModal] 评分更新成功')
      return result
    },
    onError: (error: any) => {
      console.error('[SchemeStageEditModal] 评分更新失败:', error)
      message.error(getErrorMessage(error, '评分更新失败'))
    },
  })

  // 删除文件
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await productionService.deleteProductionFile(projectId, fileId)
    },
    onSuccess: () => {
      message.success('删除成功')
      onSuccess() // 刷新列表
    },
    onError: (error: any) => {
      message.error(getErrorMessage(error, '删除失败'))
    },
  })

  const handleSubmit = async () => {
    try {
      console.log('[SchemeStageEditModal] ========== 开始保存 ==========')
      const values = await form.validateFields()
      console.log('[SchemeStageEditModal] 表单验证通过，表单值:', values)
      
      setUploading(true)
      
      // 获取新的校审单和评分
      const newReviewSheet = reviewSheetFileList.find(file => file.originFileObj && !file.status)
      const reviewSheetFile = newReviewSheet?.originFileObj
      const score = values.score !== undefined && values.score !== null ? values.score : undefined
      
      // 检查是否已有校审单记录
      const hasExistingReviewSheet = !!currentStageInfo?.review_sheet
      
      // 上传新的主文件
      const newMainFiles = mainFileList.filter(file => file.originFileObj && !file.status)
      
      // 方案阶段要求：如果该阶段还没有校审单记录，则必须提供校审单和评分
      // 如果已有校审单记录，则允许只上传主文件（不要求提供校审单，评分可选）
      if (newMainFiles.length > 0) {
        // 如果没有新上传的校审单，且该阶段也没有已存在的校审单记录，则必须上传校审单
        if (!reviewSheetFile && !hasExistingReviewSheet) {
          message.error('方案阶段必须提供校审单，请先上传校审单')
          setUploading(false)
          return
        }
        // 如果创建新的校审单记录，必须提供评分
        // 如果只是上传主文件（已有校审单），评分是可选的
        if (reviewSheetFile && score === undefined) {
          message.error('方案阶段必须填写评分')
          setUploading(false)
          return
        }
      }
      
      // 重要：如果同时有主文件和校审单文件，必须先上传校审单，再上传主文件
      // 因为后端验证逻辑：如果该阶段没有校审单记录，则不允许创建主文件记录
      // 所以需要先创建校审单记录，然后再创建主文件记录
      if (reviewSheetFile) {
        // 如果有新上传的校审单，需要确保有评分
        if (score === undefined) {
          message.error('方案阶段必须填写评分')
          setUploading(false)
          return
        }
        console.log('[SchemeStageEditModal] 先上传校审单（因为需要先创建校审单记录）')
        await uploadReviewSheetMutation.mutateAsync({
          file: reviewSheetFile,
          score,
          hasPendingMainFiles: newMainFiles.length > 0, // 传递是否有待上传的主文件
        })
        console.log('[SchemeStageEditModal] 校审单上传完成，现在可以上传主文件')
      }

      // 上传主文件（不包含校审单，因为主文件和校审单是分开的记录）
      for (const fileItem of newMainFiles) {
        if (fileItem.originFileObj) {
          console.log('[SchemeStageEditModal] 上传主文件，已有校审单:', hasExistingReviewSheet || !!reviewSheetFile)
          // 上传主文件，不包含校审单信息（主文件记录不应该有 ReviewSheetFileID）
          // 如果已有校审单记录（无论是已存在的还是刚上传的），后端会允许创建主文件记录时不提供校审单
          await uploadMainFileMutation.mutateAsync({
            file: fileItem.originFileObj,
            // 不传递 reviewSheetFile 或 reviewSheetFileId，因为主文件记录是独立的
            score, // 主文件也可以有评分（可选）
          })
        }
      }

      // 如果只更新了评分（没有上传新文件）
      if (newMainFiles.length === 0 && !reviewSheetFile && values.score !== undefined && values.score !== null) {
        const existingScore = currentStageInfo?.score
        if (existingScore !== values.score) {
          await updateScoreMutation.mutateAsync(values.score)
        }
      }

      // 刷新查询缓存，确保数据更新
      console.log('[SchemeStageEditModal] 开始刷新查询缓存')
      await queryClient.invalidateQueries({
        queryKey: ['productionFilesByStage', projectId, 'scheme'],
      })
      console.log('[SchemeStageEditModal] 查询缓存已刷新')

      // 重新获取最新数据
      console.log('[SchemeStageEditModal] 开始重新获取最新数据')
      const refreshedData = await refetchLatest()
      console.log('[SchemeStageEditModal] 重新获取到的数据:', refreshedData.data)

      setUploading(false)
      message.success('保存成功')
      form.resetFields()
      setMainFileList([])
      setReviewSheetFileList([])
      
      console.log('[SchemeStageEditModal] 调用 onSuccess 回调')
      onSuccess()
    } catch (error) {
      setUploading(false)
      console.error('保存失败:', error)
      // 错误消息已经在各个 mutation 的 onError 中处理了
    }
  }

  const handleCancel = () => {
    form.resetFields()
    setMainFileList([])
    setReviewSheetFileList([])
    onCancel()
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const mainFiles = currentStageInfo?.main_files || []
  const reviewSheet = currentStageInfo?.review_sheet

  return (
    <Modal
      title="编辑方案阶段文件"
      open={visible}
      onCancel={handleCancel}
      onOk={handleSubmit}
      confirmLoading={uploading}
      width={800}
      okText="保存"
      cancelText="取消"
    >
      <Form form={form} layout="vertical">
        {/* 方案文件上传区域 */}
        <Form.Item label="方案文件">
          <Upload.Dragger
            fileList={mainFileList}
            onChange={({ fileList: newFileList }) => {
              setMainFileList(newFileList)
            }}
            beforeUpload={() => false}
            multiple
            accept=".pdf,.doc,.docx"
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此处上传</p>
            <p className="ant-upload-hint">
              支持 PDF、DOC、DOCX 格式，最大 50MB，可上传多个文件
            </p>
          </Upload.Dragger>
          
          {/* 已上传的文件列表 */}
          {mainFiles.length > 0 && (
            <div style={{ marginTop: 15 }}>
              <List
                size="small"
                dataSource={mainFiles}
                renderItem={(file: ProductionFile) => {
                  const fileData = file.file
                  if (!fileData) return null
                  const fileSize = formatFileSize(fileData.file_size)
                  const uploadTime = dayjs(file.created_at).format('YYYY-MM-DD HH:mm')
                  return (
                    <List.Item
                      actions={[
                        <Button
                          key="delete"
                          type="link"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => {
                            deleteFileMutation.mutate(file.id)
                          }}
                        >
                          删除
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <a
                            onClick={() => {
                              productionService.downloadProductionFile(projectId, fileData.id)
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            {fileData.original_name}
                          </a>
                        }
                        description={`${fileSize} - ${uploadTime}`}
                      />
                    </List.Item>
                  )
                }}
              />
            </div>
          )}
        </Form.Item>

        {/* 校审单上传区域 */}
        <Form.Item
          label={
            <>
              校审单 <Text type="danger">*</Text>
            </>
          }
          required
        >
          <Upload.Dragger
            fileList={reviewSheetFileList}
            onChange={({ fileList: newFileList }) => {
              setReviewSheetFileList(newFileList)
            }}
            beforeUpload={() => false}
            maxCount={1}
            accept=".pdf,.doc,.docx"
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此处上传</p>
            <p className="ant-upload-hint">
              支持 PDF、DOC、DOCX 格式，最大 50MB
            </p>
          </Upload.Dragger>
          
          {/* 已上传的校审单 */}
          {reviewSheet && (
            <div style={{ marginTop: 15 }}>
              <List
                size="small"
                dataSource={[reviewSheet]}
                renderItem={(file: ProductionFile) => {
                  const fileData = file.file
                  if (!fileData) return null
                  const fileSize = formatFileSize(fileData.file_size)
                  const uploadTime = dayjs(file.created_at).format('YYYY-MM-DD HH:mm')
                  return (
                    <List.Item
                      actions={[
                        <Button
                          key="delete"
                          type="link"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => {
                            deleteFileMutation.mutate(file.id)
                          }}
                        >
                          删除
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <a
                            onClick={() => {
                              productionService.downloadProductionFile(projectId, fileData.id)
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            {fileData.original_name}
                          </a>
                        }
                        description={`${fileSize} - ${uploadTime}`}
                      />
                    </List.Item>
                  )
                }}
              />
            </div>
          )}
        </Form.Item>

        {/* 评分输入区域 */}
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
            style={{ width: '100%', maxWidth: 200 }}
          />
        </Form.Item>
        <Text type="secondary" style={{ fontSize: '12px', marginTop: -16, display: 'block', marginBottom: 16 }}>
          请输入0-100之间的分数
        </Text>
      </Form>
    </Modal>
  )
}

