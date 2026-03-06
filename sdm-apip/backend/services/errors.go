package services

import "errors"

var (
	// User related (Terkait Pengguna)
	ErrUserNotFound = errors.New("pengguna tidak ditemukan")
	ErrUserInactive = errors.New("pengguna sedang tidak aktif")

	// Group related (Terkait Kelompok/Grup)
	ErrGroupNotFound        = errors.New("kelompok referensi tidak ditemukan")
	ErrGroupNameExists      = errors.New("nama kelompok ini sudah ada")
	ErrInvalidGroupName     = errors.New("nama kelompok yang dimasukkan tidak valid")
	ErrRelationNotFound     = errors.New("hubungan (relasi) antar kelompok tidak ditemukan")
	ErrUserAlreadyInGroup   = errors.New("pengguna tersebut sudah terdaftar di kelompok pembagian lain")
	ErrAdminCannotBeInGroup = errors.New("administrator tidak diperbolehkan menjadi anggota kelompok evaluasi")
	ErrGroupLeaderExists    = errors.New("kelompok ini sudah memiliki penilai utama atau atasan")

	// Authentication (Otentikasi)
	ErrInvalidCredentials = errors.New("kredensial login tidak valid")
	ErrUnverifiedEmail    = errors.New("email akun ini belum diverifikasi")
	ErrAccountDisabled    = errors.New("akun anda dinonaktifkan sementara")
	ErrUnauthorizedRole   = errors.New("anda tidak memiliki peran yang berwenang")
	ErrAccessDenied       = errors.New("akses ditolak (access denied)")
	ErrNIPNotFound        = errors.New("nip tidak ditemukan dalam database kepegawaian master")
	ErrUserAlreadyExists  = errors.New("pengguna dengan data ini sudah terdaftar sebelumnya")
	ErrEmailMismatch      = errors.New("email yang digunakan tidak cocok dengan saat registrasi awal")
	ErrInvalidToken       = errors.New("token akses tidak valid atau sudah kadaluwarsa")
	ErrInvalidOTP         = errors.New("otp (kode sekali pakai) tidak valid atau sudah kadaluwarsa")
	ErrPasswordNotSet     = errors.New("silakan atur password anda terlebih dahulu sebelum masuk")

	// Generic (Umum)
	ErrInternalServer = errors.New("terjadi kesalahan internal pada server aplikasi (internal server error)")

	// Assessment related (Evaluasi dan Penilaian Pegawai)
	ErrPeriodNotFound      = errors.New("periode jadwal evaluasi tidak ditemukan")
	ErrPeriodInactive      = errors.New("periode evaluasi saat ini sedang tidak aktif atau sudah ditutup")
	ErrSelfAssessment      = errors.New("anda tidak dapat memberikan nilai evaluasi kepada diri sendiri")
	ErrDuplicateAssessment = errors.New("anda sudah mengirimkan evaluasi untuk pengguna ini pada periode penugasan ini")
	ErrNotInSameGroup      = errors.New("anda dan pegawai target tujuan harus berada pada lingkup evaluasi/kelompok yang berhubungan")
	ErrAdminCannotAssess   = errors.New("administrator sistem tidak diperbolehkan memberikan atau mengirimkan data evaluasi")
)
