package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/zimlivestock/backend/internal/database"
	"github.com/zimlivestock/backend/internal/middleware"
	"github.com/zimlivestock/backend/internal/models"
)

// AgentHandler provides HTTP handlers for agent management endpoints.
type AgentHandler struct {
	db *database.DB
}

// NewAgentHandler creates a new AgentHandler.
func NewAgentHandler(db *database.DB) *AgentHandler {
	return &AgentHandler{db: db}
}

type createAgentRequest struct {
	AgentType string         `json:"agent_type"`
	Name      string         `json:"name"`
	Config    map[string]any `json:"config"`
}

type updateAgentStatusRequest struct {
	Status string `json:"status"`
}

type addGoalRequest struct {
	Category          string   `json:"category"`
	PreferredBreed    *string  `json:"preferred_breed"`
	PreferredLocation *string  `json:"preferred_location"`
	MinHealth         *string  `json:"min_health"`
	MaxPrice          *float64 `json:"max_price"`
	Quantity          int      `json:"quantity"`
}

// ListAgents handles GET /api/agents.
func (h *AgentHandler) ListAgents(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errorBody("unauthorized"))
		return
	}

	rows, err := h.db.Pool.Query(r.Context(),
		`SELECT id, user_id, agent_type, name, status, config, stats, last_run_at, created_at, updated_at
		 FROM agents
		 WHERE user_id = $1
		 ORDER BY created_at DESC`, claims.UserID,
	)
	if err != nil {
		slog.Error("failed to list agents", "user_id", claims.UserID, "error", err)
		writeJSON(w, http.StatusInternalServerError, errorBody("internal server error"))
		return
	}
	defer rows.Close()

	agents := []models.Agent{}
	for rows.Next() {
		var a models.Agent
		if err := rows.Scan(
			&a.ID, &a.UserID, &a.AgentType, &a.Name, &a.Status,
			&a.Config, &a.Stats, &a.LastRunAt, &a.CreatedAt, &a.UpdatedAt,
		); err != nil {
			slog.Error("failed to scan agent row", "error", err)
			writeJSON(w, http.StatusInternalServerError, errorBody("internal server error"))
			return
		}
		agents = append(agents, a)
	}
	if err := rows.Err(); err != nil {
		slog.Error("agent row iteration error", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorBody("internal server error"))
		return
	}

	writeJSON(w, http.StatusOK, agents)
}

// CreateAgent handles POST /api/agents.
func (h *AgentHandler) CreateAgent(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errorBody("unauthorized"))
		return
	}

	var req createAgentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorBody("invalid request body"))
		return
	}

	if req.AgentType == "" || req.Name == "" {
		writeJSON(w, http.StatusBadRequest, errorBody("agent_type and name are required"))
		return
	}

	if req.Config == nil {
		req.Config = map[string]any{}
	}

	var agent models.Agent
	err := h.db.Pool.QueryRow(r.Context(),
		`INSERT INTO agents (user_id, agent_type, name, status, config, stats)
		 VALUES ($1, $2, $3, 'idle', $4, '{}'::jsonb)
		 RETURNING id, user_id, agent_type, name, status, config, stats, last_run_at, created_at, updated_at`,
		claims.UserID, req.AgentType, req.Name, req.Config,
	).Scan(
		&agent.ID, &agent.UserID, &agent.AgentType, &agent.Name, &agent.Status,
		&agent.Config, &agent.Stats, &agent.LastRunAt, &agent.CreatedAt, &agent.UpdatedAt,
	)
	if err != nil {
		slog.Error("failed to create agent", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorBody("internal server error"))
		return
	}

	writeJSON(w, http.StatusCreated, agent)
}

// UpdateStatus handles PUT /api/agents/{id}/status.
func (h *AgentHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errorBody("unauthorized"))
		return
	}

	agentID := r.PathValue("id")
	if agentID == "" {
		writeJSON(w, http.StatusBadRequest, errorBody("missing agent id"))
		return
	}

	var req updateAgentStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorBody("invalid request body"))
		return
	}

	validStatuses := map[string]bool{"idle": true, "running": true, "paused": true, "error": true}
	if !validStatuses[req.Status] {
		writeJSON(w, http.StatusBadRequest, errorBody("invalid status: must be idle, running, paused, or error"))
		return
	}

	var agent models.Agent
	err := h.db.Pool.QueryRow(r.Context(),
		`UPDATE agents SET status = $1, updated_at = now()
		 WHERE id = $2 AND user_id = $3
		 RETURNING id, user_id, agent_type, name, status, config, stats, last_run_at, created_at, updated_at`,
		req.Status, agentID, claims.UserID,
	).Scan(
		&agent.ID, &agent.UserID, &agent.AgentType, &agent.Name, &agent.Status,
		&agent.Config, &agent.Stats, &agent.LastRunAt, &agent.CreatedAt, &agent.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			writeJSON(w, http.StatusNotFound, errorBody("agent not found or not owned by you"))
			return
		}
		slog.Error("failed to update agent status", "agent_id", agentID, "error", err)
		writeJSON(w, http.StatusInternalServerError, errorBody("internal server error"))
		return
	}

	writeJSON(w, http.StatusOK, agent)
}

// AddGoal handles POST /api/agents/{id}/goals.
func (h *AgentHandler) AddGoal(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errorBody("unauthorized"))
		return
	}

	agentID := r.PathValue("id")
	if agentID == "" {
		writeJSON(w, http.StatusBadRequest, errorBody("missing agent id"))
		return
	}

	// Verify ownership.
	var ownerID string
	err := h.db.Pool.QueryRow(r.Context(),
		`SELECT user_id FROM agents WHERE id = $1`, agentID,
	).Scan(&ownerID)
	if err != nil {
		writeJSON(w, http.StatusNotFound, errorBody("agent not found"))
		return
	}
	if ownerID != claims.UserID {
		writeJSON(w, http.StatusForbidden, errorBody("not your agent"))
		return
	}

	var req addGoalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorBody("invalid request body"))
		return
	}

	if req.Category == "" {
		writeJSON(w, http.StatusBadRequest, errorBody("category is required"))
		return
	}
	if req.Quantity <= 0 {
		req.Quantity = 1
	}

	var goal models.AgentGoal
	err = h.db.Pool.QueryRow(r.Context(),
		`INSERT INTO agent_goals (agent_id, category, preferred_breed, preferred_location, min_health, max_price, quantity, status)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
		 RETURNING id, agent_id, category, preferred_breed, preferred_location, min_health, max_price, quantity, quantity_fulfilled, status, created_at`,
		agentID, req.Category, req.PreferredBreed, req.PreferredLocation,
		req.MinHealth, req.MaxPrice, req.Quantity,
	).Scan(
		&goal.ID, &goal.AgentID, &goal.Category, &goal.PreferredBreed,
		&goal.PreferredLocation, &goal.MinHealth, &goal.MaxPrice,
		&goal.Quantity, &goal.QuantityFulfilled, &goal.Status, &goal.CreatedAt,
	)
	if err != nil {
		slog.Error("failed to add goal", "agent_id", agentID, "error", err)
		writeJSON(w, http.StatusInternalServerError, errorBody("internal server error"))
		return
	}

	writeJSON(w, http.StatusCreated, goal)
}

// GetActivity handles GET /api/agents/{id}/activity.
func (h *AgentHandler) GetActivity(w http.ResponseWriter, r *http.Request) {
	agentID := r.PathValue("id")
	if agentID == "" {
		writeJSON(w, http.StatusBadRequest, errorBody("missing agent id"))
		return
	}

	rows, err := h.db.Pool.Query(r.Context(),
		`SELECT id, agent_id, event_type, message, metadata, created_at
		 FROM agent_activity_log
		 WHERE agent_id = $1
		 ORDER BY created_at DESC
		 LIMIT 100`, agentID,
	)
	if err != nil {
		slog.Error("failed to get agent activity", "agent_id", agentID, "error", err)
		writeJSON(w, http.StatusInternalServerError, errorBody("internal server error"))
		return
	}
	defer rows.Close()

	logs := []models.AgentActivityLog{}
	for rows.Next() {
		var l models.AgentActivityLog
		if err := rows.Scan(&l.ID, &l.AgentID, &l.EventType, &l.Message, &l.Metadata, &l.CreatedAt); err != nil {
			slog.Error("failed to scan activity log row", "error", err)
			writeJSON(w, http.StatusInternalServerError, errorBody("internal server error"))
			return
		}
		logs = append(logs, l)
	}
	if err := rows.Err(); err != nil {
		slog.Error("activity log row iteration error", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorBody("internal server error"))
		return
	}

	writeJSON(w, http.StatusOK, logs)
}

// GetDecisions handles GET /api/agents/{id}/decisions.
func (h *AgentHandler) GetDecisions(w http.ResponseWriter, r *http.Request) {
	agentID := r.PathValue("id")
	if agentID == "" {
		writeJSON(w, http.StatusBadRequest, errorBody("missing agent id"))
		return
	}

	rows, err := h.db.Pool.Query(r.Context(),
		`SELECT id, agent_id, goal_id, livestock_id, decision, reasoning, confidence, metadata, created_at
		 FROM agent_decisions
		 WHERE agent_id = $1
		 ORDER BY created_at DESC
		 LIMIT 100`, agentID,
	)
	if err != nil {
		slog.Error("failed to get agent decisions", "agent_id", agentID, "error", err)
		writeJSON(w, http.StatusInternalServerError, errorBody("internal server error"))
		return
	}
	defer rows.Close()

	decisions := []models.AgentDecision{}
	for rows.Next() {
		var d models.AgentDecision
		if err := rows.Scan(
			&d.ID, &d.AgentID, &d.GoalID, &d.LivestockID,
			&d.Decision, &d.Reasoning, &d.Confidence, &d.Metadata, &d.CreatedAt,
		); err != nil {
			slog.Error("failed to scan decision row", "error", err)
			writeJSON(w, http.StatusInternalServerError, errorBody("internal server error"))
			return
		}
		decisions = append(decisions, d)
	}
	if err := rows.Err(); err != nil {
		slog.Error("decision row iteration error", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorBody("internal server error"))
		return
	}

	writeJSON(w, http.StatusOK, decisions)
}
