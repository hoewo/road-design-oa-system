import { useState } from 'react'
import { Table, Button, Space, Popconfirm, message, Tag, Tooltip } from 'antd'
import { DownloadOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fileService } from '@/services/file'
import type { File } from '@/types'
import dayjs from 'dayjs'

interface FileListProps {
  files: File[]
  loading?: boolean
  canManage?: boolean | ((file: File) => boolean) // Can be a function to check per-file permission
  onRefresh?: () => void
}

const FILE_CATEGORY_LABELS: Record<string, string> = {
  // 合同相关
  contract_main: '主合同文件',
  contract_amendment: '补充协议文件',
  contract_external: '外委合同文件',
  // 招投标相关
  tender: '招标文件',
  bid: '投标文件',
  award_notice: '中标通知书',
  // 生产相关
  scheme_ppt: '方案PPT',
  preliminary_design: '初步设计',
  construction_drawing: '施工图设计',
  variation_order: '变更洽商',
  completion_report: '竣工验收',
  audit_report: '审计报告',
  // 其他
  invoice: '发票文件',
}

export const FileList = ({ files, loading, canManage = false, onRefresh }: FileListProps) => {
  const queryClient = useQueryClient()
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set())

  const downloadMutation = useMutation({
    mutationFn: async (file: File) => {
      setDownloadingIds((prev) => new Set(prev).add(file.id))
      try {
        await fileService.downloadFile(file.id, file.original_name)
      } catch (error: any) {
        // EC-015: Permission denied - show file info but not content
        if (error.message?.includes('权限') || error.message?.includes('Permission')) {
          message.warning('您没有权限下载此文件，但可以查看文件基本信息')
          // File info is already displayed in the table
        } else {
          message.error('文件下载失败：' + (error.message || '未知错误'))
        }
        throw error
      } finally {
        setDownloadingIds((prev) => {
          const next = new Set(prev)
          next.delete(file.id)
          return next
        })
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await fileService.deleteFile(fileId)
    },
    onSuccess: () => {
      message.success('文件已删除')
      queryClient.invalidateQueries({ queryKey: ['files'] })
      onRefresh?.()
    },
    onError: (error: any) => {
      message.error('删除失败：' + (error.message || '未知错误'))
    },
  })

  const handleDownload = (file: File) => {
    downloadMutation.mutate(file)
  }

  const handleDelete = (fileId: string) => {
    deleteMutation.mutate(fileId)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
  }

  const columns = [
    {
      title: '文件名',
      dataIndex: 'original_name',
      key: 'original_name',
      render: (text: string, record: File) => (
        <span style={record.deleted_at ? { textDecoration: 'line-through', color: '#999' } : {}}>
          {text}
        </span>
      ),
    },
    {
      title: '项目名称',
      dataIndex: ['project', 'project_name'],
      key: 'project_name',
      render: (text: string) => text || '-',
    },
    {
      title: '文件类型',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => (
        <Tag>{FILE_CATEGORY_LABELS[category] || category}</Tag>
      ),
    },
    {
      title: '文件大小',
      dataIndex: 'file_size',
      key: 'file_size',
      render: (size: number) => formatFileSize(size),
    },
    {
      title: '上传时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '上传人',
      dataIndex: ['uploader', 'username'],
      key: 'uploader',
      render: (text: string) => text || '-',
    },
    {
      title: '状态',
      key: 'status',
      render: (_: any, record: File) => {
        if (record.deleted_at) {
          return <Tag color="default">已删除</Tag>
        }
        return <Tag color="success">正常</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: File) => {
        const isDownloading = downloadingIds.has(record.id)
        const isDeleted = !!record.deleted_at
        // Check if user can manage this specific file (based on project access)
        const canManageThisFile = typeof canManage === 'function' 
          ? canManage(record) 
          : canManage === true

        return (
          <Space>
            {!isDeleted && (
              <Button
                type="link"
                icon={<DownloadOutlined />}
                onClick={() => handleDownload(record)}
                loading={isDownloading}
                disabled={isDownloading}
              >
                {isDownloading ? '正在下载...' : '下载'}
              </Button>
            )}
            {canManageThisFile && !isDeleted && (
              <Popconfirm
                title="确认删除文件"
                description={
                  <div>
                    <p>您确定要删除文件 <strong>{record.original_name}</strong> 吗？</p>
                    <p style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                      文件信息：<br />
                      - 项目：{record.project?.project_name || '-'}<br />
                      - 文件类型：{FILE_CATEGORY_LABELS[record.category] || record.category}<br />
                      - 文件大小：{formatFileSize(record.file_size)}<br />
                      - 上传时间：{dayjs(record.created_at).format('YYYY-MM-DD HH:mm')}
                    </p>
                    <p style={{ fontSize: 12, color: '#856404', marginTop: 8, padding: 8, background: '#fff3cd', borderRadius: 4 }}>
                      ⚠️ 注意：如果文件已被业务数据引用（如合同文件、发票文件等），系统将保留文件记录（标记为已删除），在业务数据中显示为"文件已删除"，支持重新上传。
                    </p>
                  </div>
                }
                onConfirm={() => handleDelete(record.id)}
                okText="确认删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
              >
                <Button type="link" danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            )}
            {isDeleted && (
              <Tooltip title="文件已删除，可以重新上传">
                <Button type="link" icon={<ReloadOutlined />} disabled>
                  重新上传
                </Button>
              </Tooltip>
            )}
          </Space>
        )
      },
    },
  ]

  return (
    <Table
      columns={columns}
      dataSource={files}
      loading={loading}
      rowKey="id"
      pagination={false}
    />
  )
}

