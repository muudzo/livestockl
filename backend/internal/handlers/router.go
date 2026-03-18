package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/zimlivestock/backend/internal/database"
	"github.com/zimlivestock/backend/internal/middleware"
	"github.com/zimlivestock/backend/internal/payments"
)

// NewRouter creates and returns the top-level HTTP handler with all routes wired up.
// It uses Go 1.22+ ServeMux pattern matching with method prefixes.
func NewRouter(db *database.DB, jwtSecret string, paynow *payments.PaynowClient) http.Handler {
	mux := http.NewServeMux()

	authH := NewAuthHandler(db, jwtSecret)
	livestockH := NewLivestockHandler(db)
	bidH := NewBidHandler(db)
	agentH := NewAgentHandler(db)
	paymentH := NewPaymentHandler(db, paynow)

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

	// ── Payments ────────────────────────────────────────────────────
	mux.Handle("POST /api/payments/initiate-web", authMW(http.HandlerFunc(paymentH.InitiateWebPayment)))
	mux.Handle("POST /api/payments/initiate-mobile", authMW(http.HandlerFunc(paymentH.InitiateMobilePayment)))
	mux.HandleFunc("POST /api/payments/webhook", paymentH.PaymentWebhook) // Public — Paynow calls this
	mux.Handle("POST /api/payments/poll", authMW(http.HandlerFunc(paymentH.PollPaymentStatus)))
	mux.Handle("GET /api/payments/ref/{reference}", authMW(http.HandlerFunc(paymentH.GetPaymentByReference)))

	// ── Agents (all protected except activity/decisions which are read-only) ──
	mux.Handle("GET /api/agents", authMW(http.HandlerFunc(agentH.ListAgents)))
	mux.Handle("POST /api/agents", authMW(http.HandlerFunc(agentH.CreateAgent)))
	mux.Handle("PUT /api/agents/{id}/status", authMW(http.HandlerFunc(agentH.UpdateStatus)))
	mux.Handle("POST /api/agents/{id}/goals", authMW(http.HandlerFunc(agentH.AddGoal)))
	mux.Handle("GET /api/agents/{id}/activity", authMW(http.HandlerFunc(agentH.GetActivity)))
	mux.Handle("GET /api/agents/{id}/decisions", authMW(http.HandlerFunc(agentH.GetDecisions)))

	// Apply global middleware: body limit, CORS, then logging.
	var handler http.Handler = mux
	handler = middleware.MaxBody(1 << 20)(handler) // 1MB request body limit
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
