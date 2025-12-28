import { useState } from 'react'
import { Card, Button, Space, Modal, Empty, Spin, Pagination, message } from 'antd'
import { UploadOutlined, FileOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { fileService } from '@/services/file'
import { permissionService } from '@/services/permission'
import { projectService } from '@/services/project'
import { FileUpload } from '@/components/file/FileUpload'
import { FileList } from '@/components/file/FileList'
import { FileSearch } from '@/components/file/FileSearch'
import type { File, FileCategory } from '@/types'

/**
 * 文件管理页面
 * 参考线框图：specs/main/design/wireframes/08-file-management.html
 * T298-T303, T472: 实现文件管理页面，包含所有状态和权限控制
 */
const FileManagement = () => {
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [searchParams, setSearchParams] = useState<{
    project_id?: string
    category?: FileCategory
    file_type?: string
    start_date?: string
    end_date?: string
    keyword?: string
    page?: number
    size?: number
  }>({
    page: 1,
    size: 10,
  })

  // EC-018: 文件管理采用"可查看但隐藏编辑入口"模式
  // 所有用户都可以查看文件列表，但只有有权限的用户才能看到上传和删除按钮
  // 权限检查：用户需要至少能访问一个项目才能上传文件
  // 对于删除操作，权限检查在文件级别进行（基于项目访问权限）
  const { data: canManage, isLoading: permissionLoading } = useQuery({
    queryKey: ['canManageFiles'],
    queryFn: async () => {
      // Check if user has access to any project (can upload files)
      // This is a simplified check - actual permission is checked per file/project
      // For now, we allow all authenticated users to see upload button
      // Permission will be checked when uploading (via CanAccessProject in backend)
      return true // All authenticated users can see upload button, permission checked on upload
    },
  })

  // Fetch projects for search dropdown
  const { data: projectsData } = useQuery({
    queryKey: ['projects', 'list'],
    queryFn: () => projectService.getProjects({ page: 1, size: 1000 }),
  })

  // Fetch files
  const {
    data: filesData,
    isLoading: filesLoading,
    refetch: refetchFiles,
  } = useQuery({
    queryKey: ['files', searchParams],
    queryFn: () => fileService.searchFiles(searchParams),
    enabled: !permissionLoading,
  })

  const handleSearch = (params: any) => {
    setSearchParams({
      ...params,
      page: 1, // Reset to first page on new search
      size: 10,
    })
  })

  const handleReset = () => {
    setSearchParams({
      page: 1,
      size: 10,
    })
  }

  const handleUploadSuccess = () => {
    setUploadModalVisible(false)
    refetchFiles()
  }

  const handlePageChange = (page: number, pageSize?: number) => {
    setSearchParams((prev) => ({
      ...prev,
      page,
      size: pageSize || prev.size,
    }))
  }

  // Loading state
  if (permissionLoading || filesLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="正在加载文件列表..." />
      </div>
    )
  }

  const files = filesData?.data || []
  const total = filesData?.total || 0
  const currentPage = searchParams.page || 1
  const pageSize = searchParams.size || 10

  // Check if user can manage files (upload/delete)
  // This is a general check - actual permission is checked per file based on project
  // For now, we allow all authenticated users to see upload button
  // Permission will be checked when uploading (via CanAccessProject)
  const canManageFiles = canManage !== false

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="文件管理"
        extra={
          canManageFiles && (
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setUploadModalVisible(true)}
            >
              上传文件
            </Button>
          )
        }
      >
        {/* Search Bar */}
        <FileSearch
          onSearch={handleSearch}
          onReset={handleReset}
          projects={projectsData?.data?.map((p) => ({ id: p.id, name: p.name }))}
        />

        {/* File List */}
        {files.length === 0 ? (
          <Empty
            image={<FileOutlined style={{ fontSize: 48, color: '#999' }} />}
            description={
              <div>
                <h3>未找到匹配的文件</h3>
                <p>请修改搜索条件或上传新文件</p>
              </div>
            }
          />
        ) : (
          <>
            <FileList
              files={files}
              loading={filesLoading}
              canManage={canManageFiles}
              onRefresh={refetchFiles}
            />
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={total}
                onChange={handlePageChange}
                onShowSizeChange={handlePageChange}
                showSizeChanger
                showTotal={(total) => `共 ${total} 条，每页 ${pageSize} 条`}
              />
            </div>
          </>
        )}
      </Card>

      {/* Upload Modal */}
      <Modal
        title="上传文件"
        open={uploadModalVisible}
        onCancel={() => setUploadModalVisible(false)}
        footer={null}
        width={600}
      >
        <FileUpload
          projectId={searchParams.project_id}
          onSuccess={handleUploadSuccess}
          onCancel={() => setUploadModalVisible(false)}
          projects={projectsData?.data?.map((p) => ({ id: p.id, name: p.name }))}
        />
      </Modal>
    </div>
  )
}

export default FileManagement

