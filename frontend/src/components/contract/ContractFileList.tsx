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
} from 'antd'
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import type { File, FileCategory } from '@/types'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

interface ContractFileListProps {
  projectId: string
  contractId?: string
}

export const ContractFileList = ({
  projectId,
  contractId,
}: ContractFileListProps) => {
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState<FileCategory | undefined>(undefined)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(
    null
  )
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const { data, isLoading } = useQuery({
    queryKey: [
      'contractFiles',
      projectId,
      contractId,
      keyword,
      category,
      dateRange,
      page,
      pageSize,
    ],
    queryFn: () =>
      businessService.searchContractFiles(projectId, {
        category: category || 'contract',
        keyword,
        startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
        page,
        size: pageSize,
      }),
    enabled: !!projectId,
  })

  const handleDownload = async (fileId: number, fileName: string) => {
    try {
      await businessService.downloadContractFile(fileId)
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
    setCategory(undefined)
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
      title: '文件名',
      dataIndex: 'original_name',
      key: 'original_name',
      ellipsis: true,
    },
    {
      title: '文件类型',
      dataIndex: 'file_type',
      key: 'file_type',
      width: 120,
    },
    {
      title: '文件大小',
      dataIndex: 'file_size',
      key: 'file_size',
      width: 100,
      render: (size: number) => formatFileSize(size),
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: FileCategory) => {
        const categoryMap: Record<FileCategory, string> = {
          contract: '合同文件',
          bidding: '招投标文件',
          design: '设计文件',
          audit: '审计文件',
          production: '生产文件',
          other: '其他',
        }
        return <Tag>{categoryMap[category] || category}</Tag>
      },
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
      width: 100,
      render: (_: any, record: File) => (
        <Button
          type="link"
          icon={<DownloadOutlined />}
          onClick={() => handleDownload(record.id, record.original_name)}
        >
          下载
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="搜索文件名或描述"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ width: 200 }}
          allowClear
        />
        <Select
          placeholder="选择类别"
          value={category}
          onChange={setCategory}
          style={{ width: 150 }}
          allowClear
        >
          <Select.Option value="contract">合同文件</Select.Option>
          <Select.Option value="bidding">招投标文件</Select.Option>
        </Select>
        <RangePicker
          value={dateRange}
          onChange={(dates) =>
            setDateRange(
              dates ? [dates[0] as dayjs.Dayjs, dates[1] as dayjs.Dayjs] : null
            )
          }
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
          搜索
        </Button>
        <Button onClick={handleReset}>重置</Button>
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
          onChange: (newPage, newPageSize) => {
            setPage(newPage)
            setPageSize(newPageSize)
          },
        }}
      />
    </div>
  )
}
