package integration

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
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

func TestProjectMemberIntegrationFlow(t *testing.T) {
	gin.SetMode(gin.TestMode)

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	err = db.AutoMigrate(&models.User{}, &models.Project{}, &models.ProjectMember{})
	require.NoError(t, err)
	database.DB = db

	project := &models.Project{
		ProjectName:   "集成项目",
		ProjectNumber: "INT-" + strconv.FormatInt(time.Now().UnixNano(), 10),
	}
	require.NoError(t, db.Create(project).Error)
	user := &models.User{
		Username: "int-user",
		Email:    "int-user@example.com",
		Password: "pwd",
		RealName: "集成人员",
		Role:     models.RoleDesigner,
	}
	require.NoError(t, db.Create(user).Error)

	router := gin.New()
	handler := handlers.NewProjectMemberHandler(zap.NewNop())
	router.POST("/projects/:id/members", handler.CreateMember)
	router.GET("/projects/:id/members", handler.ListMembers)

	reqBody := map[string]interface{}{
		"user_id":   user.ID,
		"role":      "designer",
		"join_date": "2024-01-05",
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(
		http.MethodPost,
		"/projects/"+strconv.FormatUint(uint64(project.ID), 10)+"/members",
		bytes.NewReader(body),
	)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusCreated, w.Code)

	reqList := httptest.NewRequest(
		http.MethodGet,
		"/projects/"+strconv.FormatUint(uint64(project.ID), 10)+"/members",
		nil,
	)
	wList := httptest.NewRecorder()
	router.ServeHTTP(wList, reqList)
	require.Equal(t, http.StatusOK, wList.Code)
	require.Contains(t, wList.Body.String(), "集成人员")
}
