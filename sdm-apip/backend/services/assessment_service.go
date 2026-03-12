package services

import (
	"errors"
	"fmt"
	"math"
	"sdm-apip-backend/config"
	"sdm-apip-backend/logger"
	"sdm-apip-backend/models"

	"gorm.io/gorm"
)

// IAssessmentService defines the contract for all assessment operations.
type IAssessmentService interface {
	// Period Management
	CreatePeriod(req models.CreatePeriodRequest) (*models.AssessmentPeriod, error)
	GetAllPeriods() ([]models.AssessmentPeriod, error)
	UpdatePeriodStatus(id uint, isActive bool) error
	DeletePeriod(id uint) error
	GetActivePeriod() (*models.AssessmentPeriod, error)

	// Relation Management
	CreateAssessmentRelation(req models.CreateRelationRequest) error
	CreateGroupRelations(req models.BulkCreateRelationsRequest) error
	GetGroupRelations(groupID uint, periodID uint) ([]models.AssessmentRelation, error)
	GetCrossGroupRelations(periodID uint) ([]models.AssessmentRelation, error)
	DeleteAssessmentRelation(id uint) error

	// Assessment Queries
	GetAssessmentTargets(evaluatorID uint, periodID uint) ([]models.AssessmentTarget, error)
	GetAssessmentMatrix(periodID uint, viewerID uint) ([]map[string]interface{}, error)
	GetAssessmentDetail(targetUserID uint, periodID uint) (*map[string]interface{}, error)

	// Assessment Actions (User)
	SubmitAssessment(evaluatorID uint, req models.SubmitAssessmentRequest) error
	GetReceivedAssessments(userID uint, periodID uint) ([]models.PeerAssessment, error)
	GetGivenAssessments(userID uint, periodID uint) ([]models.PeerAssessment, error)
	GetAssessmentSummary(userID uint, periodID uint) (*models.AssessmentSummary, error)

	// Inspektur Reference (Atasan only)
	GetAssessmentReferenceForEvaluator(evaluatorID, targetUserID, periodID uint) (*models.AssessmentReference, error)
}

type AssessmentService struct {
	db *gorm.DB
}

func NewAssessmentService() IAssessmentService {
	return &AssessmentService{db: config.DB}
}

// ── Core Assessment Logic ──────────────────────────────────────────────────

func (s *AssessmentService) GetAssessmentTargets(evaluatorID uint, periodID uint) ([]models.AssessmentTarget, error) {
	var period models.AssessmentPeriod
	if err := s.db.First(&period, periodID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPeriodNotFound
		}
		return nil, ErrInternalServer
	}
	maxMonths := periodMaxMonths(period.Frequency)

	var relations []models.AssessmentRelation
	if err := s.db.Preload("TargetUser", func(db *gorm.DB) *gorm.DB {
		return db.Select("users.*, sdm_apip.nama as name, sdm_apip.jabatan as jabatan, sdm_apip.foto as foto").
			Joins("LEFT JOIN sdm_apip ON sdm_apip.nip = users.nip")
	}).Where("evaluator_id = ? AND period_id = ?", evaluatorID, periodID).Find(&relations).Error; err != nil {
		return nil, ErrInternalServer
	}
	if len(relations) == 0 {
		return []models.AssessmentTarget{}, nil
	}

	// Batch-fetch submitted months (avoids N+1)
	targetIDs := make([]uint, len(relations))
	for i, r := range relations {
		targetIDs[i] = r.TargetUserID
	}
	type monthRow struct {
		TargetUserID    uint `gorm:"column:target_user_id"`
		AssessmentMonth int  `gorm:"column:assessment_month"`
	}
	var monthRows []monthRow
	s.db.Table("peer_assessments").
		Select("target_user_id, assessment_month").
		Where("evaluator_id = ? AND period_id = ? AND target_user_id IN ? AND deleted_at IS NULL",
			evaluatorID, periodID, targetIDs).
		Scan(&monthRows)

	submitted := make(map[uint]map[int]bool)
	for _, row := range monthRows {
		if submitted[row.TargetUserID] == nil {
			submitted[row.TargetUserID] = make(map[int]bool)
		}
		submitted[row.TargetUserID][row.AssessmentMonth] = true
	}

	var results []models.AssessmentTarget
	for _, r := range relations {
		done := []int{}
		for m := range submitted[r.TargetUserID] {
			done = append(done, m)
		}
		// simple insertion sort for small slices
		for i := 1; i < len(done); i++ {
			for j := i; j > 0 && done[j] < done[j-1]; j-- {
				done[j], done[j-1] = done[j-1], done[j]
			}
		}
		results = append(results, models.AssessmentTarget{
			Relation:       r,
			IsDone:         len(done) >= maxMonths,
			MonthsDone:     done,
			MonthsRequired: maxMonths,
		})
	}
	return results, nil
}

func (s *AssessmentService) GetAssessmentMatrix(periodID uint, viewerID uint) ([]map[string]interface{}, error) {
	var period models.AssessmentPeriod
	if err := s.db.First(&period, periodID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPeriodNotFound
		}
		return nil, ErrInternalServer
	}
	maxMonths := periodMaxMonths(period.Frequency)

	var users []models.User
	userQ := s.db.Select("users.*, sdm_apip.nama as name, sdm_apip.jabatan as jabatan").
		Joins("LEFT JOIN sdm_apip ON sdm_apip.nip = users.nip")
	if viewerID > 0 {
		var rels []models.AssessmentRelation
		s.db.Where("evaluator_id = ? AND period_id = ?", viewerID, periodID).Find(&rels)
		ids := []uint{viewerID}
		for _, r := range rels {
			ids = append(ids, r.TargetUserID)
		}
		userQ = userQ.Where("users.id IN ?", ids)
	} else {
		userQ = userQ.Where("role_id != ?", 1)
	}
	if err := userQ.Find(&users).Error; err != nil {
		return nil, ErrInternalServer
	}
	if len(users) == 0 {
		return []map[string]interface{}{}, nil
	}

	allIDs := make([]uint, len(users))
	for i, u := range users {
		allIDs[i] = u.ID
	}

	var allRelations []models.AssessmentRelation
	s.db.Where("target_user_id IN ? AND period_id = ?", allIDs, periodID).Find(&allRelations)

	var allAssessments []models.PeerAssessment
	s.db.Where("target_user_id IN ? AND period_id = ? AND deleted_at IS NULL", allIDs, periodID).Find(&allAssessments)

	byTarget := make(map[uint][]models.AssessmentRelation)
	for _, r := range allRelations {
		byTarget[r.TargetUserID] = append(byTarget[r.TargetUserID], r)
	}

	monthsSubmitted := make(map[string]map[int]bool)
	scoresByTarget := make(map[uint]map[string][]float64)
	for _, a := range allAssessments {
		key := fmt.Sprintf("%d:%d", a.TargetUserID, a.EvaluatorID)
		if monthsSubmitted[key] == nil {
			monthsSubmitted[key] = make(map[int]bool)
		}
		monthsSubmitted[key][a.AssessmentMonth] = true

		if scoresByTarget[a.TargetUserID] == nil {
			scoresByTarget[a.TargetUserID] = make(map[string][]float64)
		}
		avg := float64(a.BerorientasiPelayanan+a.Akuntabel+a.Kompeten+a.Harmonis+a.Loyal+a.Adaptif+a.Kolaboratif) / 7.0
		scoresByTarget[a.TargetUserID][a.RelationType] = append(scoresByTarget[a.TargetUserID][a.RelationType], avg)
	}

	hasDone := func(tID, eID uint) bool {
		return len(monthsSubmitted[fmt.Sprintf("%d:%d", tID, eID)]) >= maxMonths
	}
	monthsDone := func(tID, eID uint) int {
		return len(monthsSubmitted[fmt.Sprintf("%d:%d", tID, eID)])
	}

	buildRaterEntry := func(tID, eID uint) map[string]interface{} {
		return map[string]interface{}{
			"done":            hasDone(tID, eID),
			"months_done":     monthsDone(tID, eID),
			"months_required": maxMonths,
		}
	}

	var matrix []map[string]interface{}
	for _, u := range users {
		rels := byTarget[u.ID]
		sc := scoresByTarget[u.ID]
		_, _, _, status := calculateWeightsByPresence(len(sc["Atasan"]) > 0, len(sc["Peer"]) > 0, len(sc["Bawahan"]) > 0)

		raters := make(map[string]interface{})
		grouped := map[string][]uint{"Atasan": {}, "Peer": {}, "Bawahan": {}}
		for _, r := range rels {
			grouped[r.RelationType] = append(grouped[r.RelationType], r.EvaluatorID)
		}
		for role, ids := range grouped {
			if len(ids) == 0 {
				raters[role] = nil
				continue
			}
			for i, id := range ids {
				key := role
				if len(ids) > 1 {
					key = fmt.Sprintf("%s %d", role, i+1)
				}
				raters[key] = buildRaterEntry(u.ID, id)
			}
		}

		canAssess := false
		if viewerID > 0 && viewerID != u.ID {
			for _, r := range rels {
				if r.EvaluatorID == viewerID && !hasDone(u.ID, viewerID) {
					canAssess = true
					break
				}
			}
		}

		done, total := 0, len(rels)
		for _, r := range rels {
			if hasDone(u.ID, r.EvaluatorID) {
				done++
			}
		}
		pct := 0
		if total > 0 {
			pct = (done * 100) / total
		}

		matrix = append(matrix, map[string]interface{}{
			"user_id":        u.ID,
			"nip":            u.NIP,
			"name":           u.Name,
			"jabatan":        u.Jabatan,
			"status":         status,
			"raters":         raters,
			"can_assess":     canAssess,
			"total_required": total,
			"done_count":     done,
			"completion_pct": pct,
		})
	}
	return matrix, nil
}

func (s *AssessmentService) GetAssessmentDetail(targetUserID uint, periodID uint) (*map[string]interface{}, error) {
	var user models.User
	if err := s.db.Table("users").
		Select("users.*, sdm.nama as name, sdm.foto as foto").
		Joins("Left Join sdm_apip as sdm ON sdm.nip = users.nip").
		Where("users.id = ?", targetUserID).
		First(&user).Error; err != nil {
		return nil, errors.New("user not found")
	}

	var period models.AssessmentPeriod
	if err := s.db.First(&period, periodID).Error; err != nil {
		return nil, ErrPeriodNotFound
	}

	type AssessmentWithName struct {
		models.PeerAssessment
		EvaluatorName string `gorm:"column:evaluator_name"`
	}
	var rows []AssessmentWithName
	if err := s.db.Table("peer_assessments").
		Select("peer_assessments.*, sdm.nama as evaluator_name").
		Joins("Join users ON users.id = peer_assessments.evaluator_id").
		Joins("Left Join sdm_apip as sdm ON sdm.nip = users.nip").
		Where("peer_assessments.target_user_id = ? AND peer_assessments.period_id = ? AND peer_assessments.deleted_at IS NULL",
			targetUserID, periodID).
		Find(&rows).Error; err != nil {
		return nil, ErrInternalServer
	}

	type EvalScore struct {
		Name   string         `json:"name"`
		Role   string         `json:"role"`
		Scores map[string]int `json:"scores"`
	}
	indicators := []string{"Berorientasi Pelayanan", "Akuntabel", "Kompeten", "Harmonis", "Loyal", "Adaptif", "Kolaboratif"}
	detailScores := map[string][]EvalScore{"Atasan": {}, "Peer": {}, "Bawahan": {}}
	rawScores := map[string][]map[string]int{"Atasan": {}, "Peer": {}, "Bawahan": {}}

	for _, r := range rows {
		r.PeerAssessment.Evaluator.Name = r.EvaluatorName
		sc := map[string]int{
			"Berorientasi Pelayanan": r.BerorientasiPelayanan,
			"Akuntabel":              r.Akuntabel,
			"Kompeten":               r.Kompeten,
			"Harmonis":               r.Harmonis,
			"Loyal":                  r.Loyal,
			"Adaptif":                r.Adaptif,
			"Kolaboratif":            r.Kolaboratif,
		}
		rt := r.RelationType
		if rt == "Atasan" || rt == "Peer" || rt == "Bawahan" {
			detailScores[rt] = append(detailScores[rt], EvalScore{Name: r.Evaluator.Name, Role: rt, Scores: sc})
			rawScores[rt] = append(rawScores[rt], sc)
		}
	}

	wA, wP, wB, status := calculateWeightsByPresence(
		len(rawScores["Atasan"]) > 0,
		len(rawScores["Peer"]) > 0,
		len(rawScores["Bawahan"]) > 0,
	)

	avgRole := func(role string, ind string) float64 {
		sc := rawScores[role]
		if len(sc) == 0 {
			return 0
		}
		s := 0
		for _, m := range sc {
			s += m[ind]
		}
		return float64(s) / float64(len(sc))
	}

	totalPerIndicator := map[string]float64{}
	for _, ind := range indicators {
		totalPerIndicator[ind] = avgRole("Atasan", ind)*wA + avgRole("Peer", ind)*wP + avgRole("Bawahan", ind)*wB
	}
	sum := 0.0
	for _, v := range totalPerIndicator {
		sum += v
	}

	// Hitung bonus Ide Inovasi dari Atasan/Inspektur
	ideBonus := 0.0
	atAsIdeCount := 0
	for _, r := range rows {
		if r.RelationType == "Atasan" && r.IdeInovasi > 0 {
			ideBonus += float64(r.IdeInovasi)
			atAsIdeCount++
		}
	}
	avgIdeBonus := 0.0
	if atAsIdeCount > 0 {
		avgIdeBonus = ideBonus / float64(atAsIdeCount)
	}

	finalBase := sum / 7.0
	finalWithBonus := finalBase + avgIdeBonus

	resp := map[string]interface{}{
		"user":                map[string]interface{}{"name": user.Name, "nip": user.NIP},
		"period":              map[string]interface{}{"name": period.Name, "month": period.StartDate.Month().String(), "year": period.StartDate.Year()},
		"weights":             map[string]float64{"Atasan": wA * 100, "Peer": wP * 100, "Bawahan": wB * 100},
		"status":              status,
		"scores_by_role":      detailScores,
		"total_per_indicator": totalPerIndicator,
		"final_score":         finalBase,
		"ide_inovasi_bonus":   avgIdeBonus,
		"final_score_total":   finalWithBonus,
		"predikat":            models.GetPredikat(finalWithBonus),
	}
	return &resp, nil
}

func (s *AssessmentService) SubmitAssessment(evaluatorID uint, req models.SubmitAssessmentRequest) error {
	if evaluatorID == req.TargetUserID {
		return ErrSelfAssessment
	}

	var period models.AssessmentPeriod
	if err := s.db.First(&period, req.PeriodID).Error; err != nil {
		return ErrPeriodNotFound
	}
	if !period.IsActive {
		return ErrPeriodInactive
	}

	var relation models.AssessmentRelation
	err := s.db.Where("period_id = ? AND evaluator_id = ? AND target_user_id = ?",
		req.PeriodID, evaluatorID, req.TargetUserID).First(&relation).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("you are not assigned to assess this user in this period")
		}
		return ErrInternalServer
	}

	var dup int64
	s.db.Model(&models.PeerAssessment{}).
		Where("evaluator_id = ? AND target_user_id = ? AND period_id = ? AND assessment_month = ?",
			evaluatorID, req.TargetUserID, req.PeriodID, req.AssessmentMonth).
		Count(&dup)
	if dup > 0 {
		return errors.New("you have already assessed this user for this month")
	}

	assessment := models.PeerAssessment{
		EvaluatorID: evaluatorID, TargetUserID: req.TargetUserID,
		GroupID: relation.GroupID, PeriodID: req.PeriodID,
		RelationType: relation.RelationType, TargetPosition: relation.TargetPosition,
		AssessmentMonth:       req.AssessmentMonth,
		BerorientasiPelayanan: req.BerorientasiPelayanan,
		Akuntabel:             req.Akuntabel, Kompeten: req.Kompeten,
		Harmonis: req.Harmonis, Loyal: req.Loyal,
		Adaptif: req.Adaptif, Kolaboratif: req.Kolaboratif,
		Comment: req.Comment,
	}
	// Hanya simpan ide_inovasi jika evaluator adalah Atasan (Inspektur)
	if relation.RelationType == "Atasan" && req.IdeInovasi > 0 {
		assessment.IdeInovasi = req.IdeInovasi
	}
	if err := s.db.Create(&assessment).Error; err != nil {
		logger.Error("Failed to save peer assessment: %v", err)
		return ErrInternalServer
	}
	return nil
}

func (s *AssessmentService) GetReceivedAssessments(userID uint, periodID uint) ([]models.PeerAssessment, error) {
	q := s.db.Where("target_user_id = ?", userID)
	if periodID != 0 {
		q = q.Where("period_id = ?", periodID)
	}
	var assessments []models.PeerAssessment
	if err := q.Find(&assessments).Error; err != nil {
		return nil, ErrInternalServer
	}
	// Anonymise evaluator identity (360° privacy)
	for i := range assessments {
		assessments[i].EvaluatorID = 0
		assessments[i].Evaluator = models.User{}
	}
	return assessments, nil
}

func (s *AssessmentService) GetGivenAssessments(userID uint, periodID uint) ([]models.PeerAssessment, error) {
	q := s.db.Preload("TargetUser").Where("evaluator_id = ?", userID)
	if periodID != 0 {
		q = q.Where("period_id = ?", periodID)
	}
	var assessments []models.PeerAssessment
	if err := q.Find(&assessments).Error; err != nil {
		return nil, ErrInternalServer
	}
	return assessments, nil
}

func (s *AssessmentService) GetAssessmentSummary(userID uint, periodID uint) (*models.AssessmentSummary, error) {
	var assessments []models.PeerAssessment
	if err := s.db.Where("target_user_id = ? AND period_id = ? AND deleted_at IS NULL", userID, periodID).
		Find(&assessments).Error; err != nil {
		return nil, ErrInternalServer
	}
	if len(assessments) == 0 {
		return nil, nil
	}

	scores := make(map[string][]float64)
	var indSums [7]float64
	for _, a := range assessments {
		avg := float64(a.BerorientasiPelayanan+a.Akuntabel+a.Kompeten+a.Harmonis+a.Loyal+a.Adaptif+a.Kolaboratif) / 7.0
		scores[a.RelationType] = append(scores[a.RelationType], avg)
		indSums[0] += float64(a.BerorientasiPelayanan)
		indSums[1] += float64(a.Akuntabel)
		indSums[2] += float64(a.Kompeten)
		indSums[3] += float64(a.Harmonis)
		indSums[4] += float64(a.Loyal)
		indSums[5] += float64(a.Adaptif)
		indSums[6] += float64(a.Kolaboratif)
	}

	cnt := float64(len(assessments))
	indicators := []string{"Berorientasi Pelayanan", "Akuntabel", "Kompeten", "Harmonis", "Loyal", "Adaptif", "Kolaboratif"}
	details := map[string]float64{}
	for i, ind := range indicators {
		details[ind] = indSums[i] / cnt
	}

	avgRole := func(role string) float64 {
		vals := scores[role]
		if len(vals) == 0 {
			return 0
		}
		s := 0.0
		for _, v := range vals {
			s += v
		}
		return s / float64(len(vals))
	}
	wA, wP, wB, status := calculateWeightsByPresence(
		len(scores["Atasan"]) > 0, len(scores["Peer"]) > 0, len(scores["Bawahan"]) > 0,
	)
	finalScore := avgRole("Atasan")*wA + avgRole("Peer")*wP + avgRole("Bawahan")*wB

	// Hitung bonus Ide Inovasi (hanya dari penilaian Atasan/Inspektur)
	ideBonus := 0.0
	atAsCount := 0
	for _, a := range assessments {
		if a.RelationType == "Atasan" && a.IdeInovasi > 0 {
			ideBonus += float64(a.IdeInovasi)
			atAsCount++
		}
	}
	if atAsCount > 0 {
		ideBonus = ideBonus / float64(atAsCount)
	}
	finalScoreWithBonus := finalScore + ideBonus

	var period models.AssessmentPeriod
	s.db.Select("name").First(&period, periodID)

	details["Ide Inovasi (Bonus)"] = ideBonus

	return &models.AssessmentSummary{
		PeriodID:     periodID,
		PeriodName:   period.Name,
		AverageScore: finalScoreWithBonus,
		Status:       status,
		Details:      details,
	}, nil
}

func (s *AssessmentService) GetAssessmentReferenceForEvaluator(evaluatorID, targetUserID, periodID uint) (*models.AssessmentReference, error) {
	var relation models.AssessmentRelation
	err := s.db.Where("evaluator_id = ? AND target_user_id = ? AND period_id = ? AND relation_type = ?",
		evaluatorID, targetUserID, periodID, "Atasan").First(&relation).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("akses ditolak: Anda bukan penilai Atasan untuk user ini pada periode ini")
		}
		return nil, ErrInternalServer
	}

	type targetInfo struct{ Name, NIP, Jabatan string }
	var target targetInfo
	s.db.Table("users").
		Select("sdm_apip.nama as name, users.nip, sdm_apip.jabatan").
		Joins("LEFT JOIN sdm_apip ON sdm_apip.nip = users.nip").
		Where("users.id = ?", targetUserID).Scan(&target)

	var period models.AssessmentPeriod
	s.db.Select("name").First(&period, periodID)

	var reqPeer, reqBawahan int64
	s.db.Model(&models.AssessmentRelation{}).
		Where("target_user_id = ? AND period_id = ? AND relation_type = ?", targetUserID, periodID, "Peer").Count(&reqPeer)
	s.db.Model(&models.AssessmentRelation{}).
		Where("target_user_id = ? AND period_id = ? AND relation_type = ?", targetUserID, periodID, "Bawahan").Count(&reqBawahan)

	var assessments []models.PeerAssessment
	s.db.Where("target_user_id = ? AND period_id = ? AND relation_type IN ? AND deleted_at IS NULL",
		targetUserID, periodID, []string{"Peer", "Bawahan"}).Find(&assessments)

	type indSum struct {
		sum   float64
		count int
	}
	type roleMap = map[string]indSum
	byRole := map[string]roleMap{"Peer": {}, "Bawahan": {}}
	indicators := []string{"Berorientasi Pelayanan", "Akuntabel", "Kompeten", "Harmonis", "Loyal", "Adaptif", "Kolaboratif"}

	for _, a := range assessments {
		raw := map[string]float64{
			"Berorientasi Pelayanan": float64(a.BerorientasiPelayanan),
			"Akuntabel":              float64(a.Akuntabel), "Kompeten": float64(a.Kompeten),
			"Harmonis": float64(a.Harmonis), "Loyal": float64(a.Loyal),
			"Adaptif": float64(a.Adaptif), "Kolaboratif": float64(a.Kolaboratif),
		}
		for _, ind := range indicators {
			cur := byRole[a.RelationType][ind]
			cur.sum += raw[ind]
			cur.count++
			byRole[a.RelationType][ind] = cur
		}
	}

	safeAvg := func(s indSum) float64 {
		if s.count == 0 {
			return 0
		}
		return math.Round((s.sum/float64(s.count))*10) / 10
	}

	indRef := make(map[string]models.IndicatorReference)
	var peerTot, bawahanTot float64
	for _, ind := range indicators {
		pA := safeAvg(byRole["Peer"][ind])
		bA := safeAvg(byRole["Bawahan"][ind])
		peerTot += pA
		bawahanTot += bA

		oSum, oCt := 0.0, 0
		if byRole["Peer"][ind].count > 0 {
			oSum += byRole["Peer"][ind].sum
			oCt += byRole["Peer"][ind].count
		}
		if byRole["Bawahan"][ind].count > 0 {
			oSum += byRole["Bawahan"][ind].sum
			oCt += byRole["Bawahan"][ind].count
		}
		overall := 0.0
		if oCt > 0 {
			overall = math.Round((oSum/float64(oCt))*10) / 10
		}
		indRef[ind] = models.IndicatorReference{PeerAvg: pA, BawahanAvg: bA, OverallAvg: overall}
	}

	n := float64(len(indicators))
	actualPeer := byRole["Peer"]["Berorientasi Pelayanan"].count
	actualBawahan := byRole["Bawahan"]["Berorientasi Pelayanan"].count

	peerAvg, bawahanAvg := 0.0, 0.0
	if actualPeer > 0 {
		peerAvg = math.Round((peerTot/n)*10) / 10
	}
	if actualBawahan > 0 {
		bawahanAvg = math.Round((bawahanTot/n)*10) / 10
	}
	overallAvg := 0.0
	if peerAvg > 0 || bawahanAvg > 0 {
		s, c := 0.0, 0
		if peerAvg > 0 {
			s += peerAvg
			c++
		}
		if bawahanAvg > 0 {
			s += bawahanAvg
			c++
		}
		overallAvg = math.Round((s/float64(c))*10) / 10
	}

	isReady := int64(actualPeer) >= reqPeer && int64(actualBawahan) >= reqBawahan
	warning := ""
	if !isReady {
		remaining := (reqPeer - int64(actualPeer)) + (reqBawahan - int64(actualBawahan))
		warning = fmt.Sprintf("Masih ada %d penilai (Peer/Bawahan) yang belum menyelesaikan penilaian.", remaining)
	}

	ref := &models.AssessmentReference{PeriodName: period.Name, Indicators: indRef, IsReady: isReady, Warning: warning}
	ref.Target.Name = target.Name
	ref.Target.NIP = target.NIP
	ref.Target.Jabatan = target.Jabatan
	ref.Summary.PeerCount = actualPeer
	ref.Summary.BawahanCount = actualBawahan
	ref.Summary.PeerAvg = peerAvg
	ref.Summary.BawahanAvg = bawahanAvg
	ref.Summary.OverallAvg = overallAvg
	return ref, nil
}

// calculateWeightsByPresence returns (wAtasan, wPeer, wBawahan, status 1-7).
func calculateWeightsByPresence(hasA, hasP, hasB bool) (float64, float64, float64, int) {
	switch {
	case hasA && hasP && hasB:
		return 0.6, 0.2, 0.2, 1
	case !hasA && hasP && hasB:
		return 0, 0.5, 0.5, 2
	case hasA && !hasP && hasB:
		return 0.6, 0, 0.4, 3
	case hasA && hasP && !hasB:
		return 0.6, 0.4, 0, 4
	case !hasA && !hasP && hasB:
		return 0, 0, 1.0, 5
	case !hasA && hasP && !hasB:
		return 0, 1.0, 0, 6
	case hasA && !hasP && !hasB:
		return 1.0, 0, 0, 7
	default:
		return 0, 0, 0, 0
	}
}
