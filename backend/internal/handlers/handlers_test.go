package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/zimlivestock/backend/internal/auth"
	"github.com/zimlivestock/backend/internal/middleware"
)

const testJWTSecret = "test-jwt-secret-for-handlers"

// helper: create a request with JSON body
func jsonRequest(t *testing.T, method, path string, body any) *http.Request {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			t.Fatalf("encode body: %v", err)
		}
	}
	req := httptest.NewRequest(method, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	return req
}

// helper: create a request with auth token
func authedRequest(t *testing.T, method, path string, body any, userID, email string) *http.Request {
	t.Helper()
	req := jsonRequest(t, method, path, body)
	token, err := auth.GenerateToken(userID, email, testJWTSecret)
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	return req
}

// helper: parse JSON response
func parseResponse(t *testing.T, w *httptest.ResponseRecorder, v any) {
	t.Helper()
	if err := json.NewDecoder(w.Body).Decode(v); err != nil {
		t.Fatalf("decode response: %v (body: %s)", err, w.Body.String())
	}
}

// ── Auth Middleware Tests ────────────────────────────────────────────

func TestAuthMiddleware(t *testing.T) {
	protected := middleware.Auth(testJWTSecret)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := middleware.GetUserFromContext(r.Context())
		if !ok {
			http.Error(w, "no claims", 500)
			return
		}
		writeJSON(w, 200, map[string]string{"user_id": claims.UserID})
	}))

	t.Run("returns 401 without auth header", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		w := httptest.NewRecorder()
		protected.ServeHTTP(w, req)
		if w.Code != http.StatusUnauthorized {
			t.Errorf("status = %d, want 401", w.Code)
		}
	})

	t.Run("returns 401 with empty Bearer", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "Bearer ")
		w := httptest.NewRecorder()
		protected.ServeHTTP(w, req)
		if w.Code != http.StatusUnauthorized {
			t.Errorf("status = %d, want 401", w.Code)
		}
	})

	t.Run("returns 401 with invalid token", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "Bearer invalid.token.here")
		w := httptest.NewRecorder()
		protected.ServeHTTP(w, req)
		if w.Code != http.StatusUnauthorized {
			t.Errorf("status = %d, want 401", w.Code)
		}
	})

	t.Run("returns 401 with wrong secret", func(t *testing.T) {
		token, _ := auth.GenerateToken("user-1", "test@test.com", "wrong-secret")
		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		protected.ServeHTTP(w, req)
		if w.Code != http.StatusUnauthorized {
			t.Errorf("status = %d, want 401", w.Code)
		}
	})

	t.Run("returns 200 with valid token", func(t *testing.T) {
		token, _ := auth.GenerateToken("user-123", "test@test.com", testJWTSecret)
		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		protected.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Errorf("status = %d, want 200", w.Code)
		}
		var resp map[string]string
		parseResponse(t, w, &resp)
		if resp["user_id"] != "user-123" {
			t.Errorf("user_id = %q, want %q", resp["user_id"], "user-123")
		}
	})

	t.Run("accepts case-insensitive Bearer", func(t *testing.T) {
		token, _ := auth.GenerateToken("user-1", "test@test.com", testJWTSecret)
		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "bearer "+token)
		w := httptest.NewRecorder()
		protected.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Errorf("status = %d, want 200", w.Code)
		}
	})
}

// ── Helper Function Tests ───────────────────────────────────────────

func TestWriteJSON(t *testing.T) {
	t.Run("sets content type and status", func(t *testing.T) {
		w := httptest.NewRecorder()
		writeJSON(w, 201, map[string]string{"key": "value"})
		if w.Code != 201 {
			t.Errorf("status = %d, want 201", w.Code)
		}
		ct := w.Header().Get("Content-Type")
		if ct != "application/json" {
			t.Errorf("Content-Type = %q, want application/json", ct)
		}
	})

	t.Run("encodes JSON correctly", func(t *testing.T) {
		w := httptest.NewRecorder()
		writeJSON(w, 200, map[string]int{"count": 42})
		var resp map[string]int
		parseResponse(t, w, &resp)
		if resp["count"] != 42 {
			t.Errorf("count = %d, want 42", resp["count"])
		}
	})
}

func TestErrorBody(t *testing.T) {
	body := errorBody("something went wrong")
	if body["error"] != "something went wrong" {
		t.Errorf("error = %q, want %q", body["error"], "something went wrong")
	}
}

// ── Request Parsing Tests ───────────────────────────────────────────

func TestSignupRequestParsing(t *testing.T) {
	tests := []struct {
		name       string
		body       map[string]string
		wantStatus int
	}{
		{
			name:       "empty body",
			body:       map[string]string{},
			wantStatus: 400,
		},
		{
			name:       "missing password",
			body:       map[string]string{"email": "test@test.com", "first_name": "A", "last_name": "B"},
			wantStatus: 400,
		},
		{
			name:       "missing email",
			body:       map[string]string{"password": "pass123", "first_name": "A", "last_name": "B"},
			wantStatus: 400,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// We can't test the full signup flow without a DB, but we can test validation
			// by creating the handler with nil db (it should fail before hitting DB)
			h := &AuthHandler{db: nil, jwtSecret: testJWTSecret}
			req := jsonRequest(t, "POST", "/api/auth/signup", tt.body)
			w := httptest.NewRecorder()
			h.Signup(w, req)
			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d (body: %s)", w.Code, tt.wantStatus, w.Body.String())
			}
		})
	}
}

func TestLoginRequestParsing(t *testing.T) {
	tests := []struct {
		name       string
		body       map[string]string
		wantStatus int
	}{
		{
			name:       "empty body",
			body:       map[string]string{},
			wantStatus: 400,
		},
		{
			name:       "missing password",
			body:       map[string]string{"email": "test@test.com"},
			wantStatus: 400,
		},
		{
			name:       "missing email",
			body:       map[string]string{"password": "pass123"},
			wantStatus: 400,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := &AuthHandler{db: nil, jwtSecret: testJWTSecret}
			req := jsonRequest(t, "POST", "/api/auth/login", tt.body)
			w := httptest.NewRecorder()
			h.Login(w, req)
			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d (body: %s)", w.Code, tt.wantStatus, w.Body.String())
			}
		})
	}
}

// ── Livestock Handler Validation via Middleware ──────────────────────

func TestCreateListingValidation(t *testing.T) {
	// Test validation by wrapping the handler with auth middleware.
	// The handler needs claims from context, so we pass a valid token through middleware.
	h := &LivestockHandler{db: nil}
	protected := middleware.Auth(testJWTSecret)(http.HandlerFunc(h.Create))

	tests := []struct {
		name       string
		body       map[string]any
		wantStatus int
	}{
		{
			name:       "empty body fails",
			body:       map[string]any{},
			wantStatus: 400,
		},
		{
			name: "missing title fails",
			body: map[string]any{
				"category":       "Cattle",
				"starting_price": 100,
				"duration_days":  7,
			},
			wantStatus: 400,
		},
		{
			name: "zero price fails",
			body: map[string]any{
				"title":          "Test Bull",
				"category":       "Cattle",
				"starting_price": 0,
				"duration_days":  7,
			},
			wantStatus: 400,
		},
		{
			name: "zero duration fails",
			body: map[string]any{
				"title":          "Test Bull",
				"category":       "Cattle",
				"starting_price": 100,
				"duration_days":  0,
			},
			wantStatus: 400,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := authedRequest(t, "POST", "/api/livestock", tt.body, "test-user", "test@test.com")
			w := httptest.NewRecorder()
			protected.ServeHTTP(w, req)
			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d (body: %s)", w.Code, tt.wantStatus, w.Body.String())
			}
		})
	}
}

func TestCreateListingRequiresAuth(t *testing.T) {
	h := &LivestockHandler{db: nil}
	protected := middleware.Auth(testJWTSecret)(http.HandlerFunc(h.Create))

	req := jsonRequest(t, "POST", "/api/livestock", map[string]any{"title": "Bull"})
	w := httptest.NewRecorder()
	protected.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", w.Code)
	}
}
