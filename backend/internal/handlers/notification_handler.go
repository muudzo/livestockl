package handlers

import (
	"net/http"

	"github.com/zimlivestock/backend/internal/database"
	"github.com/zimlivestock/backend/internal/models"
)

type NotificationHandler struct {
	db *database.DB
}

func NewNotificationHandler(db *database.DB) *NotificationHandler {
	return &NotificationHandler{db: db}
}

func (h *NotificationHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)
	notifs, err := h.db.GetNotifications(r.Context(), userID)
	if err != nil {
		writeJSON(w, 500, errorBody(err.Error()))
		return
	}
	if notifs == nil {
		notifs = []models.Notification{} // Return empty array, not null
	}
	writeJSON(w, 200, notifs)
}

func (h *NotificationHandler) UnreadCount(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)
	count, err := h.db.GetUnreadCount(r.Context(), userID)
	if err != nil {
		writeJSON(w, 500, errorBody(err.Error()))
		return
	}
	writeJSON(w, 200, map[string]int{"count": count})
}

func (h *NotificationHandler) MarkAllRead(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)
	if err := h.db.MarkAllNotificationsRead(r.Context(), userID); err != nil {
		writeJSON(w, 500, errorBody(err.Error()))
		return
	}
	writeJSON(w, 200, map[string]bool{"success": true})
}

func (h *NotificationHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)
	id := r.PathValue("id")
	if err := h.db.DeleteNotification(r.Context(), id, userID); err != nil {
		writeJSON(w, 404, errorBody(err.Error()))
		return
	}
	writeJSON(w, 200, map[string]bool{"success": true})
}
