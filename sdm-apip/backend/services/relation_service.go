package services

import (
	"errors"
	"fmt"
	"sdm-apip-backend/logger"
	"sdm-apip-backend/models"

	"gorm.io/gorm"
)

// --- Relation Management ---

func (s *AssessmentService) CreateAssessmentRelation(req models.CreateRelationRequest) error {
	var period models.AssessmentPeriod
	if err := s.db.First(&period, req.PeriodID).Error; err != nil {
		return ErrPeriodNotFound
	}
	if req.EvaluatorID == req.TargetUserID {
		return ErrSelfAssessment
	}

	relation := models.AssessmentRelation{
		PeriodID:       req.PeriodID,
		GroupID:        req.GroupID,
		EvaluatorID:    req.EvaluatorID,
		TargetUserID:   req.TargetUserID,
		RelationType:   req.RelationType,
		TargetPosition: req.TargetPosition,
	}
	err := s.db.Where("period_id = ? AND evaluator_id = ? AND target_user_id = ?",
		req.PeriodID, req.EvaluatorID, req.TargetUserID).
		Assign(models.AssessmentRelation{
			RelationType:   req.RelationType,
			TargetPosition: req.TargetPosition,
			GroupID:        req.GroupID,
		}).
		FirstOrCreate(&relation).Error
	if err != nil {
		logger.Error("Failed to create assessment relation: %v", err)
		return ErrInternalServer
	}
	return nil
}

func (s *AssessmentService) CreateGroupRelations(req models.BulkCreateRelationsRequest) error {
	type pair struct{ evaluator, target uint }
	relMap := make(map[pair]string)

	for _, r := range req.Relations {
		if r.EvaluatorID == r.TargetUserID {
			return ErrSelfAssessment
		}
		relMap[pair{r.EvaluatorID, r.TargetUserID}] = r.RelationType
	}

	for p, relType := range relMap {
		if recip, exists := relMap[pair{p.target, p.evaluator}]; exists {
			valid := false
			switch relType {
			case "Atasan":
				valid = recip == "Bawahan"
			case "Bawahan":
				valid = recip == "Atasan"
			case "Peer":
				valid = recip == "Peer"
			}
			if !valid {
				return fmt.Errorf("inconsistent relation between User %d and User %d: %s vs %s",
					p.evaluator, p.target, relType, recip)
			}
		}
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("group_id = ? AND period_id = ?", req.GroupID, req.PeriodID).
			Delete(&models.AssessmentRelation{}).Error; err != nil {
			return err
		}
		for _, r := range req.Relations {
			relation := models.AssessmentRelation{
				PeriodID:       req.PeriodID,
				GroupID:        &req.GroupID,
				EvaluatorID:    r.EvaluatorID,
				TargetUserID:   r.TargetUserID,
				RelationType:   r.RelationType,
				TargetPosition: r.TargetPosition,
			}
			if err := tx.Create(&relation).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (s *AssessmentService) GetGroupRelations(groupID uint, periodID uint) ([]models.AssessmentRelation, error) {
	var relations []models.AssessmentRelation
	if err := s.db.Where("group_id = ? AND period_id = ?", groupID, periodID).Find(&relations).Error; err != nil {
		return nil, ErrInternalServer
	}
	return relations, nil
}

// GetCrossGroupRelations returns relations with group_id IS NULL (created via single-relation endpoint).
func (s *AssessmentService) GetCrossGroupRelations(periodID uint) ([]models.AssessmentRelation, error) {
	var relations []models.AssessmentRelation
	err := s.db.Preload("Evaluator").Preload("TargetUser").
		Where("period_id = ? AND group_id IS NULL", periodID).
		Find(&relations).Error
	if err != nil {
		return nil, ErrInternalServer
	}
	return relations, nil
}

func (s *AssessmentService) DeleteAssessmentRelation(id uint) error {
	result := s.db.Delete(&models.AssessmentRelation{}, id)
	if result.Error != nil {
		return ErrInternalServer
	}
	if result.RowsAffected == 0 {
		return errors.New("relation not found")
	}
	return nil
}
