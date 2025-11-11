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

var MinioClient *minio.Client

// InitMinIO initializes MinIO client and ensures bucket exists
func InitMinIO(cfg *config.Config) error {
	var err error

	// Initialize MinIO client
	MinioClient, err = minio.New(cfg.MinIOEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinIOAccessKey, cfg.MinIOSecretKey, ""),
		Secure: cfg.MinIOUseSSL,
	})
	if err != nil {
		return fmt.Errorf("failed to initialize MinIO client: %w", err)
	}

	// Check if bucket exists, create if not
	ctx := context.Background()
	exists, err := MinioClient.BucketExists(ctx, cfg.MinIOBucketName)
	if err != nil {
		return fmt.Errorf("failed to check bucket existence: %w", err)
	}

	if !exists {
		err = MinioClient.MakeBucket(ctx, cfg.MinIOBucketName, minio.MakeBucketOptions{})
		if err != nil {
			return fmt.Errorf("failed to create bucket: %w", err)
		}
		log.Printf("Created MinIO bucket: %s", cfg.MinIOBucketName)
	} else {
		log.Printf("MinIO bucket already exists: %s", cfg.MinIOBucketName)
	}

	log.Println("MinIO storage initialized successfully")
	return nil
}

// UploadFile uploads a file to MinIO storage
func UploadFile(ctx context.Context, bucketName, objectName string, reader io.Reader, objectSize int64, contentType string) error {
	if MinioClient == nil {
		return fmt.Errorf("MinIO client not initialized")
	}

	_, err := MinioClient.PutObject(ctx, bucketName, objectName, reader, objectSize, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return fmt.Errorf("failed to upload file: %w", err)
	}

	return nil
}

// GetFile retrieves a file from MinIO storage
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

// DeleteFile deletes a file from MinIO storage
func DeleteFile(ctx context.Context, bucketName, objectName string) error {
	if MinioClient == nil {
		return fmt.Errorf("MinIO client not initialized")
	}

	err := MinioClient.RemoveObject(ctx, bucketName, objectName, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete file: %w", err)
	}

	return nil
}

// GetPresignedURL generates a presigned URL for temporary file access
func GetPresignedURL(ctx context.Context, bucketName, objectName string, expiry time.Duration) (string, error) {
	if MinioClient == nil {
		return "", fmt.Errorf("MinIO client not initialized")
	}

	url, err := MinioClient.PresignedGetObject(ctx, bucketName, objectName, expiry, nil)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL: %w", err)
	}

	return url.String(), nil
}

// FileExists checks if a file exists in MinIO storage
func FileExists(ctx context.Context, bucketName, objectName string) (bool, error) {
	if MinioClient == nil {
		return false, fmt.Errorf("MinIO client not initialized")
	}

	_, err := MinioClient.StatObject(ctx, bucketName, objectName, minio.StatObjectOptions{})
	if err != nil {
		if minio.ToErrorResponse(err).Code == "NoSuchKey" {
			return false, nil
		}
		return false, fmt.Errorf("failed to check file existence: %w", err)
	}

	return true, nil
}
