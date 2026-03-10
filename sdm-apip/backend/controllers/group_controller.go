package controllers

import (
	"fmt"
	"math"
	"net/http"
	"sdm-apip-backend/logger"
	"sdm-apip-backend/middleware"
	"sdm-apip-backend/models"
	"sdm-apip-backend/services"
	"sdm-apip-backend/utils"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

const (
	ActionFetchGroups  = "Fetch groups"
	ActionGetGroup     = "Get group details"
	ActionCreateGroup  = "Create group"
	ActionUpdateGroup  = "Update group"
	ActionDeleteGroup  = "Delete group"
	ActionAssignUser   = "Assign user"
	ActionRemoveUser   = "Remove user"
	ActionMoveUser     = "Move user"
	ActionVerifyMember = "Verify membership"
)

// GroupController handles group management operations
type GroupController struct {
	groupService services.IGroupService
}

// NewGroupController creates a new group controller with dependency injection
func NewGroupController(gs services.IGroupService) *GroupController {
	return &GroupController{
		groupService: gs,
	}
}

// mapServiceError maps service domain errors to gin responses
func (gc *GroupController) mapServiceError(c *gin.Context, err error, action string) {
	switch err {
	case services.ErrGroupNotFound:
		utils.ErrorResponse(c, http.StatusNotFound, action, "Group not found")
	case services.ErrUserNotFound:
		utils.ErrorResponse(c, http.StatusNotFound, action, "User not found")
	case services.ErrUserInactive:
		utils.ErrorResponse(c, http.StatusForbidden, action, err.Error())
	case services.ErrAccessDenied:
		utils.ErrorResponse(c, http.StatusForbidden, action, "Access denied: you are not a member of this group")
	case services.ErrRelationNotFound:
		utils.ErrorResponse(c, http.StatusNotFound, action, "Membership record not found")
	case services.ErrGroupNameExists:
		utils.ErrorResponse(c, http.StatusConflict, action, "Nama grup ini sudah digunakan. Silakan gunakan nama grup lain.")
	case services.ErrInvalidGroupName:
		utils.ErrorResponse(c, http.StatusBadRequest, action, "Nama grup harus memiliki panjang antara 1 hingga 100 karakter.")
	case services.ErrUserAlreadyInGroup:
		utils.ErrorResponse(c, http.StatusConflict, action, "Pegawai ini sudah terdaftar di grup lain.")
	case services.ErrAdminCannotBeInGroup:
		utils.ErrorResponse(c, http.StatusForbidden, action, "Administrator tidak dapat dimasukkan ke dalam grup kerja.")
	case services.ErrGroupLeaderExists:
		utils.ErrorResponse(c, http.StatusConflict, action, "Grup ini sudah memiliki ketua. Harap ganti peran ketua lama menjadi anggota terlebih dahulu sebelum menetapkan ketua baru.")
	case services.ErrInternalServer:
		utils.ErrorResponse(c, http.StatusInternalServerError, action, fmt.Sprintf("Gagal memproses operasi '%s' karena kendala sistem. Silakan hubungi Administrator jika masalah berlanjut.", action))
	default:
		// Generic fallback for safety
		utils.ErrorResponse(c, http.StatusInternalServerError, action, fmt.Sprintf("Koneksi gagal saat mencoba '%s'. Sistem mencatat anomali ini, silakan muat ulang halaman atau lapor ke Administrator.", action))
	}
}

// GetAll returns all groups
// GET /api/admin/groups
func (gc *GroupController) GetAll(c *gin.Context) {
	// 1. Pagination Params
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}
	offset := (page - 1) * limit

	// 2. Sorting Params (Sanitization happens in Service)
	sortBy := c.DefaultQuery("sort_by", "name")
	order := strings.ToLower(c.DefaultQuery("order", "asc"))

	// 2.5 Filters
	includeArchived := c.Query("include_archived") == "true"

	// 3. Service Call
	groups, total, err := gc.groupService.GetAllGroups(sortBy, order, limit, offset, includeArchived)
	if err != nil {
		gc.mapServiceError(c, err, ActionFetchGroups)
		return
	}

	// 4. Response Mapping
	response := make([]models.GroupResponse, len(groups))
	for i, g := range groups {
		response[i] = g.ToResponse(g.UserCount, "")
	}

	// 5. Paginated Response
	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	utils.PaginatedSuccessResponse(c, http.StatusOK, "Groups retrieved successfully", response, utils.Pagination{
		CurrentPage: page,
		PerPage:     limit,
		TotalItems:  total,
		TotalPages:  totalPages,
	})
}

// GetByID returns a single group with its members
// GET /api/admin/groups/:id
func (gc *GroupController) GetByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, ActionGetGroup, "Invalid group ID")
		return
	}

	group, members, err := gc.groupService.GetGroupByID(uint(id))
	if err != nil {
		gc.mapServiceError(c, err, ActionGetGroup)
		return
	}

	globalEvaluators, _ := gc.groupService.GetGlobalEvaluators()
	utils.SuccessResponse(c, http.StatusOK, "Group details retrieved", gin.H{
		"group":             group.ToResponse(len(members), ""),
		"members":           members,
		"global_evaluators": globalEvaluators,
	})
}

// Create creates a new group
// POST /api/admin/groups
func (gc *GroupController) Create(c *gin.Context) {
	var req models.CreateGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Warn("[GroupController] Create binding error: %v", err)
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	group, err := gc.groupService.CreateGroup(req.Name, req.Description)
	if err != nil {
		gc.mapServiceError(c, err, ActionCreateGroup)
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Group created successfully", group.ToResponse(0, ""))
}

// Update updates a group
// PUT /api/admin/groups/:id
func (gc *GroupController) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, ActionUpdateGroup, "Invalid group ID")
		return
	}

	var req models.UpdateGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Warn("[GroupController] Update binding error: %v", err)
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	group, err := gc.groupService.UpdateGroup(uint(id), req.Name, req.Description)
	if err != nil {
		gc.mapServiceError(c, err, ActionUpdateGroup)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Group updated successfully", group.ToResponse(0, ""))
}

// Delete deletes a group
// DELETE /api/super-admin/groups/:id
func (gc *GroupController) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, ActionDeleteGroup, "Invalid group ID")
		return
	}

	if err := gc.groupService.DeleteGroup(uint(id)); err != nil {
		gc.mapServiceError(c, err, ActionDeleteGroup)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Group deleted successfully", nil)
}

// AssignUser assigns a user to a group
// POST /api/super-admin/groups/:id/users
func (gc *GroupController) AssignUser(c *gin.Context) {
	idStr := c.Param("id")
	groupID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, ActionAssignUser, "Invalid group ID")
		return
	}

	var req models.AssignUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Warn("[GroupController] AssignUser binding error: %v", err)
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	adminID := middleware.GetUserIDFromContext(c)
	if err := gc.groupService.AssignUserToGroup(uint(groupID), req.UserID, req.Role, adminID); err != nil {
		gc.mapServiceError(c, err, ActionAssignUser)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "User assigned to group successfully", nil)
}

// RemoveUser removes a user from a group
// DELETE /api/admin/groups/:id/users/:userId
func (gc *GroupController) RemoveUser(c *gin.Context) {
	idStr := c.Param("id")
	groupID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, ActionRemoveUser, "Invalid group ID")
		return
	}

	userIDStr := c.Param("userId")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, ActionRemoveUser, "Invalid user ID")
		return
	}

	if err := gc.groupService.RemoveUserFromGroup(uint(groupID), uint(userID)); err != nil {
		gc.mapServiceError(c, err, ActionRemoveUser)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "User removed from group successfully", nil)
}

// MoveUser moves a user from one group to another
// POST /api/admin/groups/move-user
func (gc *GroupController) MoveUser(c *gin.Context) {
	var req models.MoveUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	adminID := middleware.GetUserIDFromContext(c)
	if err := gc.groupService.MoveUserBetweenGroups(req.UserID, req.FromGroupID, req.ToGroupID, adminID); err != nil {
		gc.mapServiceError(c, err, ActionMoveUser)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "User moved successfully", nil)
}

// --- User Facing Methods ---

// GetMyGroups returns groups for the current user
// GET /api/my-groups
func (gc *GroupController) GetMyGroups(c *gin.Context) {
	userID := middleware.GetUserIDFromContext(c)
	if userID == 0 {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized", "Invalid user session")
		return
	}

	groups, err := gc.groupService.GetMyGroups(userID)
	if err != nil {
		gc.mapServiceError(c, err, ActionFetchGroups)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "My groups retrieved", groups)
}

// GetGroupDetailForUser returns detail of a group if user is member
// GET /api/groups/:id
func (gc *GroupController) GetGroupDetailForUser(c *gin.Context) {
	idStr := c.Param("id")
	groupID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, ActionGetGroup, "Invalid group ID")
		return
	}

	userID := middleware.GetUserIDFromContext(c)

	// Consolidated membership and detail retrieval
	group, members, err := gc.groupService.GetGroupDetailIfMember(userID, uint(groupID))
	if err != nil {
		gc.mapServiceError(c, err, ActionGetGroup)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Group detail retrieved", gin.H{
		"group":   group.ToResponse(len(members), ""),
		"members": members,
	})
}
