package storage

import (
	"context"
	"fmt"
	"io"
	"log"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"

	"project-oa-backend/internal/config"
)

// MinIOStorage MinIO存储实现
type MinIOStorage struct {
	client *minio.Client
	bucket string
}

// NewMinIOStorage 创建MinIO存储实例
func NewMinIOStorage(cfg *config.Config) (*MinIOStorage, error) {
	// Initialize MinIO client
	client, err := minio.New(cfg.MinIOEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinIOAccessKey, cfg.MinIOSecretKey, ""),
		Secure: cfg.MinIOUseSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to initialize MinIO client: %w", err)
	}

	storage := &MinIOStorage{
		client: client,
		bucket: cfg.MinIOBucketName,
	}

	// Check if bucket exists, create if not
	ctx := context.Background()
	exists, err := client.BucketExists(ctx, cfg.MinIOBucketName)
	if err != nil {
		return nil, fmt.Errorf("failed to check bucket existence: %w", err)
	}

	if !exists {
		err = client.MakeBucket(ctx, cfg.MinIOBucketName, minio.MakeBucketOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to create bucket: %w", err)
		}
		log.Printf("Created MinIO bucket: %s", cfg.MinIOBucketName)
	} else {
		log.Printf("MinIO bucket already exists: %s", cfg.MinIOBucketName)
	}

	log.Println("MinIO storage initialized successfully")
	return storage, nil
}

// UploadFile 上传文件到MinIO存储
func (s *MinIOStorage) UploadFile(ctx context.Context, bucket, objectName string, file io.Reader, size int64) error {
	_, err := s.client.PutObject(ctx, bucket, objectName, file, size, minio.PutObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to upload file: %w", err)
	}
	return nil
}

// GetFile 获取文件内容
func (s *MinIOStorage) GetFile(ctx context.Context, bucket, objectName string) (io.Reader, error) {
	object, err := s.client.GetObject(ctx, bucket, objectName, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get file: %w", err)
	}
	return object, nil
}

// DeleteFile 删除文件
func (s *MinIOStorage) DeleteFile(ctx context.Context, bucket, objectName string) error {
	err := s.client.RemoveObject(ctx, bucket, objectName, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete file: %w", err)
	}
	return nil
}

// GetFileURL 获取文件访问URL
func (s *MinIOStorage) GetFileURL(ctx context.Context, bucket, objectName string, expiry time.Duration) (string, error) {
	url, err := s.client.PresignedGetObject(ctx, bucket, objectName, expiry, nil)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL: %w", err)
	}
	return url.String(), nil
}

// FileExists 检查文件是否存在
func (s *MinIOStorage) FileExists(ctx context.Context, bucket, objectName string) (bool, error) {
	_, err := s.client.StatObject(ctx, bucket, objectName, minio.StatObjectOptions{})
	if err != nil {
		if minio.ToErrorResponse(err).Code == "NoSuchKey" {
			return false, nil
		}
		return false, fmt.Errorf("failed to check file existence: %w", err)
	}
	return true, nil
}

// 向后兼容的全局变量和函数
var (
	MinioClient   *minio.Client
	globalStorage Storage
)

// InitMinIO 初始化MinIO存储（向后兼容）
func InitMinIO(cfg *config.Config) error {
	storage, err := NewMinIOStorage(cfg)
	if err != nil {
		return err
	}
	globalStorage = storage
	// 保持向后兼容
	MinioClient = storage.client
	return nil
}

// UploadFile 上传文件（向后兼容，支持contentType参数）
func UploadFile(ctx context.Context, bucketName, objectName string, reader io.Reader, objectSize int64, contentType string) error {
	if globalStorage == nil {
		return fmt.Errorf("storage not initialized")
	}
	return globalStorage.UploadFile(ctx, bucketName, objectName, reader, objectSize)
}

// GetFile 获取文件（向后兼容，返回*minio.Object）
func GetFile(ctx context.Context, bucketName, objectName string) (*minio.Object, error) {
	if MinioClient == nil {
		return nil, fmt.Errorf("MinIO client not initialized")
	}
	object, err := MinioClient.GetObject(ctx, bucketName, objectName, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get file: %w", err)
	}
	return object, nil
}

// DeleteFile 删除文件（向后兼容）
func DeleteFile(ctx context.Context, bucketName, objectName string) error {
	if globalStorage == nil {
		return fmt.Errorf("storage not initialized")
	}
	return globalStorage.DeleteFile(ctx, bucketName, objectName)
}

// GetPresignedURL 获取预签名URL（向后兼容）
func GetPresignedURL(ctx context.Context, bucketName, objectName string, expiry time.Duration) (string, error) {
	if globalStorage == nil {
		return "", fmt.Errorf("storage not initialized")
	}
	return globalStorage.GetFileURL(ctx, bucketName, objectName, expiry)
}

// FileExists 检查文件是否存在（向后兼容）
func FileExists(ctx context.Context, bucketName, objectName string) (bool, error) {
	if globalStorage == nil {
		return false, fmt.Errorf("storage not initialized")
	}
	return globalStorage.FileExists(ctx, bucketName, objectName)
}
