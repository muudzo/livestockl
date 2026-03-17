package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/zimlivestock/backend/internal/auth"
	"github.com/zimlivestock/backend/internal/database"
	"github.com/zimlivestock/backend/internal/middleware"
	"github.com/zimlivestock/backend/internal/models"
)

// AuthHandler provides HTTP handlers for authentication endpoints.
type AuthHandler struct {
	db        *database.DB
	jwtSecret string
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(db *database.DB, jwtSecret string) *AuthHandler {
	return &AuthHandler{db: db, jwtSecret: jwtSecret}
}

type signupRequest struct {
	Email     string `json:"email"`
	Password  string `json:"password"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Phone     string `json:"phone"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type authResponse struct {
	Token string         `json:"token"`
	User  profilePayload `json:"user"`
}

// profilePayload is a safe representation of a user profile (no password hash).
type profilePayload struct {
	ID         string    `json:"id"`
	Email      string    `json:"email"`
	FirstName  string    `json:"first_name"`
	LastName   string    `json:"last_name"`
	Phone      string    `json:"phone"`
	Verified   bool      `json:"verified"`
	Rating     float64   `json:"rating"`
	SalesCount int       `json:"sales_count"`
	CreatedAt  time.Time `json:"created_at"`
}

func toProfilePayload(p models.Profile) profilePayload {
	return profilePayload{
		ID:         p.ID,
		Email:      p.Email,
		FirstName:  p.FirstName,
		LastName:   p.LastName,
		Phone:      p.Phone,
		Verified:   p.Verified,
		Rating:     p.Rating,
		SalesCount: p.SalesCount,
		CreatedAt:  p.CreatedAt,
	}
}

// Signup handles POST /api/auth/signup.
func (h *AuthHandler) Signup(w http.ResponseWriter, r *http.Request) {
	var req signupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorBody("invalid request body"))
		return
	}

	if req.Email == "" || req.Password == "" || req.FirstName == "" || req.LastName == "" {
		writeJSON(w, http.StatusBadRequest, errorBody("email, password, first_name and last_name are required"))
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		slog.Error("failed to hash password", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorBody("internal server error"))
		return
	}

	var profile models.Profile
	err = h.db.Pool.QueryRow(r.Context(),
		`INSERT INTO profiles (email, password_hash, first_name, last_name, phone)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, email, first_name, last_name, phone, verified, rating, sales_count, created_at`,
		req.Email, hash, req.FirstName, req.LastName, req.Phone,
	).Scan(
		&profile.ID, &profile.Email, &profile.FirstName, &profile.LastName,
		&profile.Phone, &profile.Verified, &profile.Rating, &profile.SalesCount,
		&profile.CreatedAt,
	)
	if err != nil {
		slog.Error("failed to insert profile", "error", err)
		writeJSON(w, http.StatusConflict, errorBody("email already registered"))
		return
	}

	token, err := auth.GenerateToken(profile.ID, profile.Email, h.jwtSecret)
	if err != nil {
		slog.Error("failed to generate token", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorBody("internal server error"))
		return
	}

	writeJSON(w, http.StatusCreated, authResponse{
		Token: token,
		User:  toProfilePayload(profile),
	})
}

// Login handles POST /api/auth/login.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorBody("invalid request body"))
		return
	}

	if req.Email == "" || req.Password == "" {
		writeJSON(w, http.StatusBadRequest, errorBody("email and password are required"))
		return
	}

	var profile models.Profile
	err := h.db.Pool.QueryRow(r.Context(),
		`SELECT id, email, first_name, last_name, phone, password_hash, verified, rating, sales_count, created_at
		 FROM profiles WHERE email = $1`,
		req.Email,
	).Scan(
		&profile.ID, &profile.Email, &profile.FirstName, &profile.LastName,
		&profile.Phone, &profile.PasswordHash, &profile.Verified, &profile.Rating,
		&profile.SalesCount, &profile.CreatedAt,
	)
	if err != nil {
		slog.Error("login: user not found", "email", req.Email, "error", err)
		writeJSON(w, http.StatusUnauthorized, errorBody("invalid email or password"))
		return
	}

	if !auth.CheckPassword(req.Password, profile.PasswordHash) {
		writeJSON(w, http.StatusUnauthorized, errorBody("invalid email or password"))
		return
	}

	token, err := auth.GenerateToken(profile.ID, profile.Email, h.jwtSecret)
	if err != nil {
		slog.Error("failed to generate token", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorBody("internal server error"))
		return
	}

	writeJSON(w, http.StatusOK, authResponse{
		Token: token,
		User:  toProfilePayload(profile),
	})
}

// Me handles GET /api/auth/me.
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errorBody("unauthorized"))
		return
	}

	var profile models.Profile
	err := h.db.Pool.QueryRow(r.Context(),
		`SELECT id, email, first_name, last_name, phone, verified, rating, sales_count, created_at
		 FROM profiles WHERE id = $1`,
		claims.UserID,
	).Scan(
		&profile.ID, &profile.Email, &profile.FirstName, &profile.LastName,
		&profile.Phone, &profile.Verified, &profile.Rating, &profile.SalesCount,
		&profile.CreatedAt,
	)
	if err != nil {
		slog.Error("failed to fetch profile", "user_id", claims.UserID, "error", err)
		writeJSON(w, http.StatusNotFound, errorBody("user not found"))
		return
	}

	writeJSON(w, http.StatusOK, toProfilePayload(profile))
}
