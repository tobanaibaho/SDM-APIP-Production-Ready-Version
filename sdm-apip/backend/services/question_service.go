package services

import (
	"errors"
	"sdm-apip-backend/config"
	"sdm-apip-backend/models"

	"gorm.io/gorm"
)

type IQuestionService interface {
	GetAllQuestions(includeInactive bool) ([]models.Question, error)
	CreateQuestion(req models.CreateQuestionRequest) (*models.Question, error)
	UpdateQuestion(id uint, req models.UpdateQuestionRequest) (*models.Question, error)
	DeleteQuestion(id uint) error
	BulkImportQuestions(rows []models.CreateQuestionRequest) (int, error)
}

type QuestionService struct {
	db *gorm.DB
}

func NewQuestionService() IQuestionService {
	return &QuestionService{db: config.DB}
}

func (s *QuestionService) GetAllQuestions(includeInactive bool) ([]models.Question, error) {
	var questions []models.Question
	q := s.db.Model(&models.Question{})
	if !includeInactive {
		q = q.Where("is_active = ?", true)
	}
	err := q.Order("indicator ASC, id ASC").Find(&questions).Error
	return questions, err
}

func (s *QuestionService) CreateQuestion(req models.CreateQuestionRequest) (*models.Question, error) {
	question := models.Question{
		Indicator: req.Indicator,
		Text:      req.Text,
		IsActive:  true,
	}
	err := s.db.Create(&question).Error
	if err != nil {
		return nil, err
	}
	return &question, nil
}

func (s *QuestionService) UpdateQuestion(id uint, req models.UpdateQuestionRequest) (*models.Question, error) {
	var question models.Question
	if err := s.db.First(&question, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("question not found")
		}
		return nil, err
	}

	updates := map[string]interface{}{}
	if req.Indicator != "" {
		updates["indicator"] = req.Indicator
	}
	if req.Text != "" {
		updates["text"] = req.Text
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	if len(updates) > 0 {
		if err := s.db.Model(&question).Updates(updates).Error; err != nil {
			return nil, err
		}
	}

	return &question, nil
}

func (s *QuestionService) DeleteQuestion(id uint) error {
	var question models.Question
	if err := s.db.First(&question, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("question not found")
		}
		return err
	}
	// Use soft delete
	return s.db.Delete(&question).Error
}

func (s *QuestionService) BulkImportQuestions(rows []models.CreateQuestionRequest) (int, error) {
	validIndicators := map[string]bool{
		"Berorientasi Pelayanan": true, "Akuntabel": true, "Kompeten": true,
		"Harmonis": true, "Loyal": true, "Adaptif": true, "Kolaboratif": true,
	}

	var toInsert []models.Question
	for _, r := range rows {
		if r.Text == "" || !validIndicators[r.Indicator] {
			continue
		}
		toInsert = append(toInsert, models.Question{
			Indicator: r.Indicator,
			Text:      r.Text,
			IsActive:  true,
		})
	}

	if len(toInsert) == 0 {
		return 0, errors.New("tidak ada baris yang valid untuk diimport")
	}

	if err := s.db.Create(&toInsert).Error; err != nil {
		return 0, err
	}
	return len(toInsert), nil
}
