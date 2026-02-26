package services

import "errors"

var (
	// User related
	ErrUserNotFound = errors.New("user not found")
	ErrUserInactive = errors.New("user inactive")

	// Group related
	ErrGroupNotFound        = errors.New("group not found")
	ErrGroupNameExists      = errors.New("group name already exists")
	ErrInvalidGroupName     = errors.New("invalid group name")
	ErrRelationNotFound     = errors.New("relation not found")
	ErrUserAlreadyInGroup   = errors.New("user is already assigned to another group")
	ErrAdminCannotBeInGroup = errors.New("administrators cannot be assigned to groups")
	ErrGroupLeaderExists    = errors.New("group already has a leader")

	// Authentication
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUnverifiedEmail    = errors.New("email unverified")
	ErrAccountDisabled    = errors.New("account disabled")
	ErrUnauthorizedRole   = errors.New("unauthorized role")
	ErrAccessDenied       = errors.New("access denied")
	ErrNIPNotFound        = errors.New("nip not found in master data")
	ErrUserAlreadyExists  = errors.New("user already registered")
	ErrEmailMismatch      = errors.New("email does not match initial registration")
	ErrInvalidToken       = errors.New("invalid or expired token")
	ErrInvalidOTP         = errors.New("invalid or expired otp")
	ErrPasswordNotSet     = errors.New("please set your password before logging in")

	// Generic
	ErrInternalServer = errors.New("internal server error")

	// Assessment related
	ErrPeriodNotFound      = errors.New("assessment period not found")
	ErrPeriodInactive      = errors.New("assessment period is not active")
	ErrSelfAssessment      = errors.New("you cannot assess yourself")
	ErrDuplicateAssessment = errors.New("you have already submitted an assessment for this user in this period")
	ErrNotInSameGroup      = errors.New("you and the target user must be in the same group")
	ErrAdminCannotAssess   = errors.New("administrators are not allowed to submit assessments")
)
