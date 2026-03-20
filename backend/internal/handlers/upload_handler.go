package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type UploadHandler struct {
	uploadDir string
}

func NewUploadHandler(uploadDir string) *UploadHandler {
	return &UploadHandler{uploadDir: uploadDir}
}

func (h *UploadHandler) Upload(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)

	// Parse multipart form (max 5MB)
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		writeJSON(w, 400, errorBody("file too large, max 5MB"))
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeJSON(w, 400, errorBody("file is required"))
		return
	}
	defer file.Close()

	// Validate content type
	contentType := header.Header.Get("Content-Type")
	allowed := map[string]string{
		"image/jpeg": ".jpg",
		"image/png":  ".png",
		"image/webp": ".webp",
		"image/gif":  ".gif",
	}
	ext, ok := allowed[contentType]
	if !ok {
		writeJSON(w, 400, errorBody("only JPEG, PNG, WebP, and GIF images are allowed"))
		return
	}

	// Create user directory
	userDir := filepath.Join(h.uploadDir, userID)
	if err := os.MkdirAll(userDir, 0755); err != nil {
		writeJSON(w, 500, errorBody("failed to create upload directory"))
		return
	}

	// Generate filename
	filename := fmt.Sprintf("%d%s", time.Now().UnixMilli(), ext)
	filePath := filepath.Join(userDir, filename)

	// Sanitize: ensure the final path is within uploadDir
	absPath, _ := filepath.Abs(filePath)
	absUploadDir, _ := filepath.Abs(h.uploadDir)
	if !strings.HasPrefix(absPath, absUploadDir) {
		writeJSON(w, 400, errorBody("invalid file path"))
		return
	}

	// Write file
	dst, err := os.Create(filePath)
	if err != nil {
		writeJSON(w, 500, errorBody("failed to save file"))
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		writeJSON(w, 500, errorBody("failed to write file"))
		return
	}

	// Return public URL
	url := fmt.Sprintf("/uploads/%s/%s", userID, filename)
	writeJSON(w, 200, map[string]string{"url": url})
}
