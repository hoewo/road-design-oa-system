package storage

import (
	"context"
	"io"
	"time"
)

// Storage 定义统一的存储接口，支持 MinIO 和 OSS 两种实现
type Storage interface {
	// UploadFile 上传文件到存储
	// bucket: 存储桶名称
	// objectName: 对象名称（文件路径）
	// file: 文件内容
	// size: 文件大小（字节）
	UploadFile(ctx context.Context, bucket, objectName string, file io.Reader, size int64) error

	// GetFile 获取文件内容
	// bucket: 存储桶名称
	// objectName: 对象名称（文件路径）
	// 返回文件读取器
	GetFile(ctx context.Context, bucket, objectName string) (io.Reader, error)

	// DeleteFile 删除文件
	// bucket: 存储桶名称
	// objectName: 对象名称（文件路径）
	DeleteFile(ctx context.Context, bucket, objectName string) error

	// GetFileURL 获取文件访问URL（预签名URL或直接URL）
	// bucket: 存储桶名称
	// objectName: 对象名称（文件路径）
	// expiry: URL有效期
	// 返回文件访问URL
	GetFileURL(ctx context.Context, bucket, objectName string, expiry time.Duration) (string, error)

	// FileExists 检查文件是否存在
	// bucket: 存储桶名称
	// objectName: 对象名称（文件路径）
	// 返回文件是否存在
	FileExists(ctx context.Context, bucket, objectName string) (bool, error)
}
