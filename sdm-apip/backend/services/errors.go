package services

import "errors"

var (
	// Terkait Pengguna
	ErrUserNotFound = errors.New("Pengguna tidak ditemukan")
	ErrUserInactive = errors.New("Pengguna sedang tidak aktif")

	// Terkait Kelompok/Tim
	ErrGroupNotFound        = errors.New("Kelompok referensi tidak ditemukan")
	ErrGroupNameExists      = errors.New("Nama kelompok ini sudah ada")
	ErrInvalidGroupName     = errors.New("Nama kelompok yang dimasukkan tidak valid")
	ErrRelationNotFound     = errors.New("Hubungan (relasi) antar kelompok tidak ditemukan")
	ErrUserAlreadyInGroup   = errors.New("Pengguna tersebut sudah terdaftar di kelompok lain")
	ErrAdminCannotBeInGroup = errors.New("Administrator tidak diperbolehkan menjadi anggota kelompok evaluasi")
	ErrGroupLeaderExists    = errors.New("Kelompok ini sudah memiliki penilai utama atau atasan")

	// Otentikasi
	ErrInvalidCredentials = errors.New("Kredensial login tidak valid")
	ErrUnverifiedEmail    = errors.New("Email akun ini belum diverifikasi")
	ErrAccountDisabled    = errors.New("Akun anda dinonaktifkan sementara")
	ErrUnauthorizedRole   = errors.New("Anda tidak memiliki peran yang berwenang")
	ErrAccessDenied       = errors.New("Akses ditolak (access denied)")
	ErrNIPNotFound        = errors.New("Nip tidak ditemukan dalam database kepegawaian master")
	ErrUserAlreadyExists  = errors.New("Pengguna dengan data ini sudah terdaftar sebelumnya")
	ErrEmailMismatch      = errors.New("Email yang digunakan tidak cocok dengan saat registrasi awal")
	ErrInvalidToken       = errors.New("Token akses tidak valid atau sudah kadaluwarsa")
	ErrInvalidOTP         = errors.New("OTP (kode sekali pakai) tidak valid atau sudah kadaluwarsa")
	ErrPasswordNotSet     = errors.New("Silakan atur password anda terlebih dahulu sebelum masuk")

	// Umum
	ErrInternalServer = errors.New("Terjadi kesalahan internal pada server aplikasi (internal server error)")

	// Terkait Penilaian (Assessment)
	ErrPeriodNotFound      = errors.New("Periode jadwal evaluasi tidak ditemukan")
	ErrPeriodInactive      = errors.New("Periode evaluasi saat ini sedang tidak aktif atau sudah ditutup")
	ErrSelfAssessment      = errors.New("Anda tidak dapat memberikan nilai evaluasi kepada diri sendiri")
	ErrDuplicateAssessment = errors.New("Anda sudah mengirimkan evaluasi untuk pengguna ini pada periode penugasan ini")
	ErrNotInSameGroup      = errors.New("Anda dan pegawai target tujuan harus berada pada lingkup evaluasi/kelompok yang berhubungan")
	ErrAdminCannotAssess   = errors.New("Administrator sistem tidak diperbolehkan memberikan atau mengirimkan data evaluasi")
)
