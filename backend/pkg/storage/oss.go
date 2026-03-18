package storage

import (
	"context"
	"fmt"
	"io"
	"log"
	"time"

	"github.com/aliyun/aliyun-oss-go-sdk/oss"

	"project-oa-backend/internal/config"
)

// OSSStorage 阿里云OSS存储实现
type OSSStorage struct {
	client     *oss.Client
	bucket     *oss.Bucket
	bucketName string
}

// NewOSSStorage 创建OSS存储实例
func NewOSSStorage(cfg *config.Config) (*OSSStorage, error) {
	// Initialize OSS client
	client, err := oss.New(cfg.OSSEndpoint, cfg.OSSAccessKeyID, cfg.OSSAccessKeySecret)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize OSS client: %w", err)
	}

	storage := &OSSStorage{
		client:     client,
		bucketName: cfg.OSSBucketName,
	}

	// Check if bucket exists
	exists, err := client.IsBucketExist(cfg.OSSBucketName)
	if err != nil {
		return nil, fmt.Errorf("failed to check bucket existence: %w", err)
	}

	if !exists {
		// Try to create bucket if it doesn't exist
		err = client.CreateBucket(cfg.OSSBucketName)
		if err != nil {
			return nil, fmt.Errorf("failed to create OSS bucket: %w", err)
		}
		log.Printf("Created OSS bucket: %s", cfg.OSSBucketName)
	} else {
		log.Printf("OSS bucket already exists: %s", cfg.OSSBucketName)
	}

	// Get bucket
	bucket, err := client.Bucket(cfg.OSSBucketName)
	if err != nil {
		return nil, fmt.Errorf("failed to get OSS bucket: %w", err)
	}
	storage.bucket = bucket

	log.Println("OSS storage initialized successfully")
	return storage, nil
}

// UploadFile 上传文件到OSS存储
func (s *OSSStorage) UploadFile(ctx context.Context, bucket, objectName string, file io.Reader, size int64) error {
	err := s.bucket.PutObject(objectName, file)
	if err != nil {
		return fmt.Errorf("failed to upload file: %w", err)
	}
	return nil
}

// GetFile 获取文件内容
func (s *OSSStorage) GetFile(ctx context.Context, bucket, objectName string) (io.Reader, error) {
	body, err := s.bucket.GetObject(objectName)
	if err != nil {
		return nil, fmt.Errorf("failed to get file: %w", err)
	}
	return body, nil
}

// DeleteFile 删除文件
func (s *OSSStorage) DeleteFile(ctx context.Context, bucket, objectName string) error {
	err := s.bucket.DeleteObject(objectName)
	if err != nil {
		return fmt.Errorf("failed to delete file: %w", err)
	}
	return nil
}

// GetFileURL 获取文件访问URL
func (s *OSSStorage) GetFileURL(ctx context.Context, bucket, objectName string, expiry time.Duration) (string, error) {
	signedURL, err := s.bucket.SignURL(objectName, oss.HTTPGet, int64(expiry.Seconds()))
	if err != nil {
		return "", fmt.Errorf("failed to generate signed URL: %w", err)
	}
	return signedURL, nil
}

// FileExists 检查文件是否存在
func (s *OSSStorage) FileExists(ctx context.Context, bucket, objectName string) (bool, error) {
	exists, err := s.bucket.IsObjectExist(objectName)
	if err != nil {
		return false, fmt.Errorf("failed to check file existence: %w", err)
	}
	return exists, nil
}

// ListFiles 按前缀列举对象
func (s *OSSStorage) ListFiles(ctx context.Context, bucket, prefix string) ([]ObjectInfo, error) {
	lor, err := s.bucket.ListObjects(oss.Prefix(prefix))
	if err != nil {
		return nil, fmt.Errorf("list objects: %w", err)
	}
	result := make([]ObjectInfo, 0, len(lor.Objects))
	for _, obj := range lor.Objects {
		result = append(result, ObjectInfo{
			Key:          obj.Key,
			Size:         obj.Size,
			LastModified: obj.LastModified,
		})
	}
	return result, nil
}
