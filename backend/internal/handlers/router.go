package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/zimlivestock/backend/internal/database"
	"github.com/zimlivestock/backend/internal/middleware"
)

// NewRouter creates and returns the top-level HTTP handler with all routes wired up.
// It uses Go 1.22+ ServeMux pattern matching with method prefixes.
func NewRouter(db *database.DB, jwtSecret string) http.Handler {
	mux := http.NewServeMux()

	authH := NewAuthHandler(db, jwtSecret)
	livestockH := NewLivestockHandler(db)
	bidH := NewBidHandler(db)
	agentH := NewAgentHandler(db)

	authMW := middleware.Auth(jwtSecret)

	// ── Auth (public) ────────────────────────────────────────────────
	mux.HandleFunc("POST /api/auth/signup", authH.Signup)
	mux.HandleFunc("POST /api/auth/login", authH.Login)

	// ── Auth (protected) ─────────────────────────────────────────────
	mux.Handle("GET /api/auth/me", authMW(http.HandlerFunc(authH.Me)))

	// ── Livestock (public reads) ─────────────────────────────────────
	mux.HandleFunc("GET /api/livestock", livestockH.List)
	mux.HandleFunc("GET /api/livestock/{id}", livestockH.Get)

	// ── Livestock (protected writes) ─────────────────────────────────
	mux.Handle("POST /api/livestock", authMW(http.HandlerFunc(livestockH.Create)))
	mux.Handle("DELETE /api/livestock/{id}", authMW(http.HandlerFunc(livestockH.Delete)))

	// ── Bids (public reads) ──────────────────────────────────────────
	mux.HandleFunc("GET /api/bids/{livestockId}", bidH.List)

	// ── Bids (protected writes) ──────────────────────────────────────
	mux.Handle("POST /api/bids", authMW(http.HandlerFunc(bidH.Place)))

	// ── Agents (all protected except activity/decisions which are read-only) ──
	mux.Handle("GET /api/agents", authMW(http.HandlerFunc(agentH.ListAgents)))
	mux.Handle("POST /api/agents", authMW(http.HandlerFunc(agentH.CreateAgent)))
	mux.Handle("PUT /api/agents/{id}/status", authMW(http.HandlerFunc(agentH.UpdateStatus)))
	mux.Handle("POST /api/agents/{id}/goals", authMW(http.HandlerFunc(agentH.AddGoal)))
	mux.HandleFunc("GET /api/agents/{id}/activity", agentH.GetActivity)
	mux.HandleFunc("GET /api/agents/{id}/decisions", agentH.GetDecisions)

	// Apply global middleware: CORS first, then logging.
	var handler http.Handler = mux
	handler = middleware.Logging()(handler)
	handler = middleware.CORS()(handler)

	return handler
}

// writeJSON is a helper that writes a JSON response with the given status code.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		// Best-effort; headers already sent.
		_ = err
	}
}

// errorBody returns a map suitable for JSON error responses.
func errorBody(msg string) map[string]string {
	return map[string]string{"error": msg}
}
