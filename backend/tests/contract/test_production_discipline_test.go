package contract

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"project-oa-backend/internal/handlers"
	"project-oa-backend/internal/models"
	"project-oa-backend/pkg/database"
)

func TestProductionDisciplineAssignmentsContract(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	err = db.AutoMigrate(&models.Project{}, &models.User{}, &models.ProjectDisciplineAssignment{})
	require.NoError(t, err)
	database.DB = db

	project := &models.Project{ProjectName: "生产测试", ProjectNumber: "P-001"}
	require.NoError(t, db.Create(project).Error)

	designer := &models.User{Username: "d1", Email: "d1@example.com", Password: "pwd", RealName: "设计1"}
	participant := &models.User{Username: "p1", Email: "p1@example.com", Password: "pwd", RealName: "参与1"}
	reviewer := &models.User{Username: "r1", Email: "r1@example.com", Password: "pwd", RealName: "复核1"}
	require.NoError(t, db.Create(designer).Error)
	require.NoError(t, db.Create(participant).Error)
	require.NoError(t, db.Create(reviewer).Error)

	handler := handlers.NewProjectDisciplineHandler(zap.NewNop())
	router := gin.New()
	router.PUT("/projects/:id/production/discipline-assignments", handler.ReplaceAssignments)
	router.GET("/projects/:id/production/discipline-assignments", handler.ListAssignments)

	payload := map[string]interface{}{
		"assignments": []map[string]interface{}{
			{
				"discipline":     "道路",
				"designer_id":    designer.ID,
				"participant_id": participant.ID,
				"reviewer_id":    reviewer.ID,
			},
		},
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPut, "/projects/"+uintToString(project.ID)+"/production/discipline-assignments", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)
	require.Equal(t, http.StatusOK, resp.Code)

	listReq := httptest.NewRequest(http.MethodGet, "/projects/"+uintToString(project.ID)+"/production/discipline-assignments", nil)
	listResp := httptest.NewRecorder()
	router.ServeHTTP(listResp, listReq)
	require.Equal(t, http.StatusOK, listResp.Code)
	require.Contains(t, listResp.Body.String(), "道路")
}
