package models

import "time"

const (
	MultipartUploadStatusInProgress = "in_progress"
	MultipartUploadStatusCompleted  = "completed"
	MultipartUploadStatusAborted    = "aborted"
)

// MultipartUpload 分片上传任务（用于断点续传）
type MultipartUpload struct {
	UploadID   string       `json:"upload_id" gorm:"type:varchar(64);primaryKey"`
	ProjectID  string       `json:"project_id" gorm:"type:uuid;not null;index"`
	Category   FileCategory `json:"category" gorm:"type:varchar(64);not null"`
	FileName   string       `json:"file_name" gorm:"not null"`
	FileSize   int64        `json:"file_size" gorm:"not null"`
	MimeType   string       `json:"mime_type" gorm:"not null"`
	FileID     string       `json:"file_id" gorm:"type:uuid;not null"`     // 最终文件 ID，与路径一致
	ObjectKey  string       `json:"object_key" gorm:"not null"`             // 最终存储路径
	UploaderID string       `json:"uploader_id" gorm:"type:uuid;not null"`
	Status     string       `json:"status" gorm:"type:varchar(32);not null;default:in_progress"`
	CreatedAt  time.Time    `json:"created_at"`
	UpdatedAt  time.Time    `json:"updated_at"`
}

func (MultipartUpload) TableName() string {
	return "multipart_uploads"
}

// MultipartUploadPart 已上传分片记录（part 实际存储在对象 multipart/{upload_id}/{part_number}）
type MultipartUploadPart struct {
	UploadID    string    `json:"upload_id" gorm:"type:varchar(64);primaryKey"`
	PartNumber  int       `json:"part_number" gorm:"primaryKey"`
	Size        int64     `json:"size" gorm:"not null"`
	CreatedAt   time.Time `json:"created_at"`
}

func (MultipartUploadPart) TableName() string {
	return "multipart_upload_parts"
}
