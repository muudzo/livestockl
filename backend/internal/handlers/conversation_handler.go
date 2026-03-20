package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/zimlivestock/backend/internal/database"
)

type ConversationHandler struct {
	db *database.DB
}

func NewConversationHandler(db *database.DB) *ConversationHandler {
	return &ConversationHandler{db: db}
}

func (h *ConversationHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)
	convs, err := h.db.GetConversations(r.Context(), userID)
	if err != nil {
		writeJSON(w, 500, errorBody(err.Error()))
		return
	}
	writeJSON(w, 200, convs)
}

func (h *ConversationHandler) Start(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)
	var req struct {
		SellerID    string  `json:"seller_id"`
		LivestockID *string `json:"livestock_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, errorBody("invalid request body"))
		return
	}
	if req.SellerID == "" {
		writeJSON(w, 400, errorBody("seller_id is required"))
		return
	}
	conv, err := h.db.StartConversation(r.Context(), userID, req.SellerID, req.LivestockID)
	if err != nil {
		writeJSON(w, 500, errorBody(err.Error()))
		return
	}
	writeJSON(w, 201, conv)
}
