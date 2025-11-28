package contract

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"project-oa-backend/internal/handlers"
	"project-oa-backend/internal/middleware"
	"project-oa-backend/internal/models"
	"project-oa-backend/pkg/database"
)

func TestProductionApprovalContract(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	err = db.AutoMigrate(&models.Project{}, &models.User{}, &models.ProductionApprovalRecord{}, &models.AuditResolution{})
	require.NoError(t, err)
	database.DB = db

	project := &models.Project{ProjectName: "审批项目", ProjectNumber: "PA-001"}
	require.NoError(t, db.Create(project).Error)
	approver := &models.User{Username: "approver", Email: "a@example.com", Password: "pwd", RealName: "审批人"}
	require.NoError(t, db.Create(approver).Error)
	creator := &models.User{Username: "creator", Email: "c@example.com", Password: "pwd", RealName: "创建者"}
	require.NoError(t, db.Create(creator).Error)

	handler := handlers.NewProductionApprovalHandler(zap.NewNop())
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set(string(middleware.UserIDKey), creator.ID)
		c.Next()
	})
	router.POST("/projects/:id/production/approvals", handler.CreateApproval)
	router.GET("/projects/:id/production/approvals", handler.ListApprovals)

	signedAt := time.Now().Format(time.RFC3339)
	payload := map[string]interface{}{
		"record_type":              "review",
		"approver_id":              approver.ID,
		"status":                   "pending",
		"signed_at":                signedAt,
		"report_type":              "approval",
		"amount_design":            1000,
		"amount_survey":            500,
		"amount_consultation":      200,
		"default_amount_reference": "Contract #1",
		"override_reason":          "调整说明",
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/projects/"+uintToString(project.ID)+"/production/approvals", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)
	require.Equal(t, http.StatusCreated, resp.Code)

	listReq := httptest.NewRequest(http.MethodGet, "/projects/"+uintToString(project.ID)+"/production/approvals", nil)
	listResp := httptest.NewRecorder()
	router.ServeHTTP(listResp, listReq)
	require.Equal(t, http.StatusOK, listResp.Code)
	require.Contains(t, listResp.Body.String(), "审批人")
}
