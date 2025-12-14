package contract

import (
	"bytes"
	"encoding/json"
	"fmt"
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
	"project-oa-backend/internal/models"
	"project-oa-backend/pkg/database"
)

func setupProjectMemberContractEnv(t *testing.T) (*gin.Engine, *models.Project, *models.User) {
	gin.SetMode(gin.TestMode)

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	err = db.AutoMigrate(&models.User{}, &models.Project{}, &models.ProjectMember{})
	require.NoError(t, err)
	database.DB = db

	project := &models.Project{
		ProjectName:   "合同测试项目",
		ProjectNumber: fmt.Sprintf("PM-%d", time.Now().UnixNano()),
	}
	require.NoError(t, db.Create(project).Error)
	user := &models.User{
		Username: fmt.Sprintf("tester-%d", time.Now().UnixNano()),
		Email:    fmt.Sprintf("tester-%d@example.com", time.Now().UnixNano()),
		Password: "pwd",
		RealName: "合约成员",
		Role:     models.RoleProjectManager,
	}
	require.NoError(t, db.Create(user).Error)

	logger := zap.NewNop()
	router := gin.New()
	projectMemberHandler := handlers.NewProjectMemberHandler(logger)

	api := router.Group("/api/v1")
	{
		api.POST("/projects/:id/members", projectMemberHandler.CreateMember)
		api.GET("/projects/:id/members", projectMemberHandler.ListMembers)
		api.PUT("/project-members/:id", projectMemberHandler.UpdateMember)
		api.DELETE("/project-members/:id", projectMemberHandler.DeleteMember)
	}

	return router, project, user
}

func TestProjectMemberContract_CreateAndList(t *testing.T) {
	router, project, user := setupProjectMemberContractEnv(t)

	payload := map[string]interface{}{
		"user_id":   user.ID,
		"role":      "manager",
		"join_date": time.Now().AddDate(0, -1, 0).Format("2006-01-02"),
	}

	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/projects/"+uintToString(project.ID)+"/members", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusCreated, w.Code)

	reqList := httptest.NewRequest(http.MethodGet, "/api/v1/projects/"+uintToString(project.ID)+"/members", nil)
	wList := httptest.NewRecorder()
	router.ServeHTTP(wList, reqList)
	require.Equal(t, http.StatusOK, wList.Code)
}

func TestProjectMemberIntegration_UpdateFlow(t *testing.T) {
	router, project, user := setupProjectMemberContractEnv(t)

	payload := map[string]interface{}{
		"user_id":   user.ID,
		"role":      "designer",
		"join_date": "2024-01-02",
	}

	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/projects/"+uintToString(project.ID)+"/members", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusCreated, w.Code)

	var response map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &response))
	data := response["data"].(map[string]interface{})
	memberID := uintFromInterface(data["id"])

	updatePayload := map[string]interface{}{
		"role":       "reviewer",
		"leave_date": "2024-05-01",
		"is_active":  false,
	}
	updateBody, _ := json.Marshal(updatePayload)
	reqUpdate := httptest.NewRequest(http.MethodPut, "/api/v1/project-members/"+uintToString(memberID), bytes.NewReader(updateBody))
	reqUpdate.Header.Set("Content-Type", "application/json")
	wUpdate := httptest.NewRecorder()
	router.ServeHTTP(wUpdate, reqUpdate)
	require.Equal(t, http.StatusOK, wUpdate.Code)
}
