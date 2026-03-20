package handlers

import (
	"net/http"

	"github.com/zimlivestock/backend/internal/database"
)

type FavoriteHandler struct {
	db *database.DB
}

func NewFavoriteHandler(db *database.DB) *FavoriteHandler {
	return &FavoriteHandler{db: db}
}

func (h *FavoriteHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)
	ids, err := h.db.GetFavoriteIDs(r.Context(), userID)
	if err != nil {
		writeJSON(w, 500, errorBody(err.Error()))
		return
	}
	if ids == nil {
		ids = []string{}
	}
	writeJSON(w, 200, ids)
}

func (h *FavoriteHandler) Toggle(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)
	livestockID := r.PathValue("livestockId")
	added, err := h.db.ToggleFavorite(r.Context(), userID, livestockID)
	if err != nil {
		writeJSON(w, 500, errorBody(err.Error()))
		return
	}
	writeJSON(w, 200, map[string]bool{"added": added})
}
