package logger

import (
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"sync"
)

var (
	infoLog  *log.Logger
	warnLog  *log.Logger
	errorLog *log.Logger
	logFile  *os.File
	once     sync.Once
)

// logFlags mengembalikan penanda (flags) log berdasarkan GIN_MODE
// Dalam mode rilis, Lshortfile dihilangkan untuk mengurangi beban kerja dan mencegah kebocoran struktur file
func logFlags() int {
	if os.Getenv("GIN_MODE") == "release" {
		return log.Ldate | log.Ltime
	}
	return log.Ldate | log.Ltime | log.Lshortfile
}

func init() {
	// Inisialisasi sederhana ke konsol secara default
	flags := logFlags()
	infoLog = log.New(os.Stdout, "INFO: ", flags)
	warnLog = log.New(os.Stdout, "WARN: ", flags)
	errorLog = log.New(os.Stderr, "ERROR: ", flags)
}

// SetupLogger menginisialisasi pencatatan log ke dalam file (thread-safe, hanya dijalankan sekali)
func SetupLogger(filePath string) error {
	var setupErr error
	once.Do(func() {
		setupErr = setupLoggerInternal(filePath)
	})
	return setupErr
}

// setupLoggerInternal melakukan konfigurasi logger yang sebenarnya
func setupLoggerInternal(filePath string) error {
	if filePath == "" {
		return nil
	}

	// Pastikan direktori sudah ada
	dir := filepath.Dir(filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	f, err := os.OpenFile(filePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}

	logFile = f
	multiInfo := io.MultiWriter(os.Stdout, logFile)
	multiWarn := io.MultiWriter(os.Stdout, logFile)
	multiError := io.MultiWriter(os.Stderr, logFile)

	flags := logFlags()
	infoLog = log.New(multiInfo, "INFO: ", flags)
	warnLog = log.New(multiWarn, "WARN: ", flags)
	errorLog = log.New(multiError, "ERROR: ", flags)

	return nil
}

func Info(format string, v ...interface{}) {
	infoLog.Printf(format, v...)
}

func Warn(format string, v ...interface{}) {
	warnLog.Printf(format, v...)
}

func Error(format string, v ...interface{}) {
	errorLog.Printf(format, v...)
}

func Fatal(format string, v ...interface{}) {
	errorLog.Printf(format, v...)
	if logFile != nil {
		logFile.Close()
	}
	os.Exit(1)
}

// ========================================
// FONDASI LOGGING TERSTRUKTUR (Untuk Masa Depan)
// ========================================

// Fields merepresentasikan kolom-kolom log terstruktur
type Fields map[string]interface{}

// LogEntry merepresentasikan satu entri log terstruktur
type LogEntry struct {
	level  string
	fields Fields
}

// WithFields membuat entri log baru dengan kolom terstruktur
func WithFields(fields Fields) *LogEntry {
	return &LogEntry{
		fields: fields,
	}
}

// Info mencatat pesan informasi (info) dengan kolom terstruktur
func (e *LogEntry) Info(message string) {
	e.level = "INFO"
	e.log(infoLog, message)
}

// Warn mencatat pesan peringatan (warning) dengan kolom terstruktur
func (e *LogEntry) Warn(message string) {
	e.level = "WARN"
	e.log(warnLog, message)
}

// Error mencatat pesan kesalahan (error) dengan kolom terstruktur
func (e *LogEntry) Error(message string) {
	e.level = "ERROR"
	e.log(errorLog, message)
}

// log memformat dan menulis entri log
func (e *LogEntry) log(logger *log.Logger, message string) {
	if len(e.fields) == 0 {
		logger.Println(message)
		return
	}

	// Format: pesan kolom1=nilai1 kolom2=nilai2
	fieldsStr := ""
	for k, v := range e.fields {
		fieldsStr += fmt.Sprintf(" %s=%v", k, v)
	}
	logger.Printf("%s%s", message, fieldsStr)
}
