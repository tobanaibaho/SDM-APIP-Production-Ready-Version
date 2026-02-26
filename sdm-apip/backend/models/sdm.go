package models

import (
	"time"

	"gorm.io/gorm"
)

// SDM represents SDM APIP master data
type SDM struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	NIP             string         `gorm:"column:nip;size:18;unique;not null" json:"nip"`
	Nama            string         `gorm:"column:nama;size:255;not null" json:"nama"`
	Email           string         `gorm:"column:email;size:255;not null" json:"email"`
	Jabatan         string         `gorm:"column:jabatan;size:255" json:"jabatan"`
	PangkatGolongan string         `gorm:"column:pangkat_golongan;size:255" json:"pangkat_golongan"`
	Pendidikan      string         `gorm:"column:pendidikan;size:255" json:"pendidikan"`
	NomorHP         string         `gorm:"column:nomor_hp;size:50" json:"nomor_hp"`
	UnitKerja       string         `gorm:"column:unit_kerja;size:255" json:"unit_kerja"`
	Foto            string         `gorm:"column:foto;size:255" json:"foto"`
	CreatedAt       time.Time      `gorm:"column:created_at" json:"created_at"`
	UpdatedAt       time.Time      `gorm:"column:updated_at" json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

func (SDM) TableName() string {
	return "sdm_apip"
}

// SDMCreateRequest for creating new SDM
type SDMCreateRequest struct {
	NIP             string `json:"nip" binding:"required,len=18"`
	Nama            string `json:"nama" binding:"required"`
	Email           string `json:"email" binding:"required,email"`
	Jabatan         string `json:"jabatan"`
	PangkatGolongan string `json:"pangkat_golongan"`
	Pendidikan      string `json:"pendidikan"`
	NomorHP         string `json:"nomor_hp"`
	UnitKerja       string `json:"unit_kerja"`
	Foto            string `json:"foto"`
}

// SDMUpdateRequest for updating SDM
type SDMUpdateRequest struct {
	Nama            string `json:"nama"`
	Email           string `json:"email" binding:"omitempty,email"`
	Jabatan         string `json:"jabatan"`
	PangkatGolongan string `json:"pangkat_golongan"`
	Pendidikan      string `json:"pendidikan"`
	NomorHP         string `json:"nomor_hp"`
	UnitKerja       string `json:"unit_kerja"`
	Foto            string `json:"foto"`
}

// SDMResponse for API response
type SDMResponse struct {
	ID              uint   `json:"id"`
	NIP             string `json:"nip"`
	Nama            string `json:"nama"`
	Email           string `json:"email"`
	Jabatan         string `json:"jabatan"`
	PangkatGolongan string `json:"pangkat_golongan"`
	Pendidikan      string `json:"pendidikan"`
	NomorHP         string `json:"nomor_hp"`
	UnitKerja       string `json:"unit_kerja"`
	Foto            string `json:"foto"`
	CreatedAt       string `json:"created_at"`
	UpdatedAt       string `json:"updated_at"`
}

func (s *SDM) ToResponse() SDMResponse {
	return SDMResponse{
		ID:              s.ID,
		NIP:             s.NIP,
		Nama:            s.Nama,
		Email:           s.Email,
		Jabatan:         s.Jabatan,
		PangkatGolongan: s.PangkatGolongan,
		Pendidikan:      s.Pendidikan,
		NomorHP:         s.NomorHP,
		UnitKerja:       s.UnitKerja,
		Foto:            s.Foto,
		CreatedAt:       s.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt:       s.UpdatedAt.Format("2006-01-02 15:04:05"),
	}
}
