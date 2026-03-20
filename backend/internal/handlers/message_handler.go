package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/zimlivestock/backend/internal/database"
)

type MessageHandler struct {
	db *database.DB
}

func NewMessageHandler(db *database.DB) *MessageHandler {
	return &MessageHandler{db: db}
}

func (h *MessageHandler) List(w http.ResponseWriter, r *http.Request) {
	conversationID := r.PathValue("conversationId")
	msgs, err := h.db.GetMessages(r.Context(), conversationID)
	if err != nil {
		writeJSON(w, 500, errorBody(err.Error()))
		return
	}
	writeJSON(w, 200, msgs)
}

func (h *MessageHandler) Send(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)
	var req struct {
		ConversationID string `json:"conversation_id"`
		Content        string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, errorBody("invalid request body"))
		return
	}
	if req.ConversationID == "" || req.Content == "" {
		writeJSON(w, 400, errorBody("conversation_id and content are required"))
		return
	}
	msg, err := h.db.SendMessage(r.Context(), req.ConversationID, userID, req.Content)
	if err != nil {
		writeJSON(w, 500, errorBody(err.Error()))
		return
	}
	writeJSON(w, 201, msg)
}
