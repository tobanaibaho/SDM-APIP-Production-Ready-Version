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

// logFlags returns log flags based on GIN_MODE
// In release mode, excludes Lshortfile to reduce overhead and prevent file structure leakage
func logFlags() int {
	if os.Getenv("GIN_MODE") == "release" {
		return log.Ldate | log.Ltime
	}
	return log.Ldate | log.Ltime | log.Lshortfile
}

func init() {
	// Simple initialization to console by default
	flags := logFlags()
	infoLog = log.New(os.Stdout, "INFO: ", flags)
	warnLog = log.New(os.Stdout, "WARN: ", flags)
	errorLog = log.New(os.Stderr, "ERROR: ", flags)
}

// SetupLogger initializes logging to a file (thread-safe, runs once)
func SetupLogger(filePath string) error {
	var setupErr error
	once.Do(func() {
		setupErr = setupLoggerInternal(filePath)
	})
	return setupErr
}

// setupLoggerInternal performs the actual logger setup
func setupLoggerInternal(filePath string) error {
	if filePath == "" {
		return nil
	}

	// Ensure directory exists
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
// STRUCTURED LOGGING FOUNDATION (Future)
// ========================================

// Fields represents structured log fields
type Fields map[string]interface{}

// LogEntry represents a structured log entry
type LogEntry struct {
	level  string
	fields Fields
}

// WithFields creates a new log entry with structured fields
func WithFields(fields Fields) *LogEntry {
	return &LogEntry{
		fields: fields,
	}
}

// Info logs an info message with structured fields
func (e *LogEntry) Info(message string) {
	e.level = "INFO"
	e.log(infoLog, message)
}

// Warn logs a warning message with structured fields
func (e *LogEntry) Warn(message string) {
	e.level = "WARN"
	e.log(warnLog, message)
}

// Error logs an error message with structured fields
func (e *LogEntry) Error(message string) {
	e.level = "ERROR"
	e.log(errorLog, message)
}

// log formats and writes the log entry
func (e *LogEntry) log(logger *log.Logger, message string) {
	if len(e.fields) == 0 {
		logger.Println(message)
		return
	}

	// Format: message field1=value1 field2=value2
	fieldsStr := ""
	for k, v := range e.fields {
		fieldsStr += fmt.Sprintf(" %s=%v", k, v)
	}
	logger.Printf("%s%s", message, fieldsStr)
}
