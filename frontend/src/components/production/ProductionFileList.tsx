import { useState } from 'react'
import {
  Table,
  Button,
  Space,
  message,
  Input,
  Select,
  DatePicker,
  Tag,
  Modal,
} from 'antd'
import {
  DownloadOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { productionService } from '@/services/production'
import { ProductionFileUpload } from './ProductionFileUpload'
import type { ProductionFile, ProductionFileType } from '@/types'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

interface ProductionFileListProps {
  projectId: string | number
  onGetContractAmount?: () => Promise<{
    design_fee?: number
    survey_fee?: number
    consultation_fee?: number
  }>
}

const FILE_TYPE_LABELS: Record<ProductionFileType, string> = {
  scheme_ppt: '方案PPT',
  preliminary_design: '初步设计',
  construction_drawing: '施工图设计',
  variation_order: '变更洽商',
  completion_report: '竣工验收',
  audit_report: '审计报告',
  other: '其他',
}

export const ProductionFileList = ({
  projectId,
  onGetContractAmount,
}: ProductionFileListProps) => {
  const [keyword, setKeyword] = useState('')
  const [fileType, setFileType] = useState<ProductionFileType | undefined>(
    undefined
  )
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(
    null
  )
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [uploadModalVisible, setUploadModalVisible] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: [
      'productionFiles',
      projectId,
      keyword,
      fileType,
      dateRange,
      page,
      pageSize,
    ],
    queryFn: () =>
      productionService.listProductionFiles(projectId, {
        keyword,
        fileType: fileType,
        startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
        page,
        size: pageSize,
      }),
    enabled: !!projectId,
  })

  const handleDownload = async (fileId: string | number, fileName: string) => {
    try {
      await productionService.downloadProductionFile(projectId, fileId)
      message.success(`正在下载 ${fileName}`)
    } catch (error: any) {
      message.error(error.message || '下载失败')
    }
  }

  const handleSearch = () => {
    setPage(1)
  }

  const handleReset = () => {
    setKeyword('')
    setFileType(undefined)
    setDateRange(null)
    setPage(1)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const columns = [
    {
      title: '文件类型',
      dataIndex: 'file_type',
      key: 'file_type',
      width: 120,
      render: (type: ProductionFileType) => (
        <Tag color="blue">{FILE_TYPE_LABELS[type] || type}</Tag>
      ),
    },
    {
      title: '文件名',
      dataIndex: ['file', 'original_name'],
      key: 'file_name',
      ellipsis: true,
    },
    {
      title: '文件大小',
      dataIndex: ['file', 'file_size'],
      key: 'file_size',
      width: 100,
      render: (size: number) => formatFileSize(size),
    },
    {
      title: '校审单',
      dataIndex: 'review_sheet_file',
      key: 'review_sheet_file',
      width: 100,
      render: (file: any) =>
        file ? <Tag color="green">已上传</Tag> : <Tag>未上传</Tag>,
    },
    {
      title: '评分',
      dataIndex: 'score',
      key: 'score',
      width: 80,
      render: (score: number | undefined) =>
        score !== undefined ? <Tag color="orange">{score}</Tag> : '-',
    },
    {
      title: '金额引用',
      dataIndex: 'default_amount_reference',
      key: 'default_amount_reference',
      ellipsis: true,
      render: (ref: string) => ref || '-',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '上传时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: ProductionFile) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() =>
              handleDownload(
                record.file_id,
                record.file?.original_name || 'file'
              )
            }
          >
            下载
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Space
        style={{ marginBottom: 16, width: '100%' }}
        direction="vertical"
        size="middle"
      >
        <Space>
          <Input
            placeholder="搜索文件名或描述"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            placeholder="文件类型"
            value={fileType}
            onChange={setFileType}
            style={{ width: 150 }}
            allowClear
          >
            {Object.entries(FILE_TYPE_LABELS).map(([value, label]) => (
              <Select.Option key={value} value={value}>
                {label}
              </Select.Option>
            ))}
          </Select>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as any)}
            format="YYYY-MM-DD"
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
          >
            搜索
          </Button>
          <Button onClick={handleReset}>重置</Button>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => setUploadModalVisible(true)}
          >
            上传文件
          </Button>
        </Space>
      </Space>

      <Table
        columns={columns}
        dataSource={data?.data || []}
        loading={isLoading}
        rowKey="id"
        pagination={{
          current: page,
          pageSize: pageSize,
          total: data?.total || 0,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, size) => {
            setPage(page)
            setPageSize(size)
          },
        }}
      />

      <Modal
        title="上传生产文件"
        open={uploadModalVisible}
        onCancel={() => setUploadModalVisible(false)}
        footer={null}
        width={800}
      >
        <ProductionFileUpload
          projectId={projectId}
          onSuccess={() => {
            setUploadModalVisible(false)
            refetch()
          }}
          onGetContractAmount={onGetContractAmount}
        />
      </Modal>
    </>
  )
}
