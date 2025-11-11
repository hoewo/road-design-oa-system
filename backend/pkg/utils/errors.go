package utils

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

// AppError represents an application error with HTTP status code
type AppError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Err     error  `json:"-"`
}

// Error implements the error interface
func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

// Unwrap returns the underlying error
func (e *AppError) Unwrap() error {
	return e.Err
}

// NewAppError creates a new application error
func NewAppError(code int, message string, err error) *AppError {
	return &AppError{
		Code:    code,
		Message: message,
		Err:     err,
	}
}

// Common error constructors
func ErrBadRequest(message string, err error) *AppError {
	return NewAppError(http.StatusBadRequest, message, err)
}

func ErrUnauthorized(message string, err error) *AppError {
	return NewAppError(http.StatusUnauthorized, message, err)
}

func ErrForbidden(message string, err error) *AppError {
	return NewAppError(http.StatusForbidden, message, err)
}

func ErrNotFound(message string, err error) *AppError {
	return NewAppError(http.StatusNotFound, message, err)
}

func ErrConflict(message string, err error) *AppError {
	return NewAppError(http.StatusConflict, message, err)
}

func ErrInternalServer(message string, err error) *AppError {
	return NewAppError(http.StatusInternalServerError, message, err)
}

func ErrValidation(message string, err error) *AppError {
	return NewAppError(http.StatusUnprocessableEntity, message, err)
}

// ErrorResponse represents a standard error response
type ErrorResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

// HandleError handles errors and sends a JSON response
func HandleError(c *gin.Context, statusCode int, message string, err error) {
	errorMsg := message
	if err != nil {
		errorMsg = fmt.Sprintf("%s: %v", message, err)
	}

	c.JSON(statusCode, ErrorResponse{
		Success: false,
		Error:   errorMsg,
		Message: message,
	})
	c.Abort()
}
