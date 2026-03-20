package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/zimlivestock/backend/internal/database"
	"github.com/zimlivestock/backend/internal/middleware"
	"github.com/zimlivestock/backend/internal/models"
)

// BidHandler provides HTTP handlers for bid-related endpoints.
type BidHandler struct {
	db *database.DB
}

// NewBidHandler creates a new BidHandler.
func NewBidHandler(db *database.DB) *BidHandler {
	return &BidHandler{db: db}
}

type placeBidRequest struct {
	LivestockID string  `json:"livestock_id"`
	Amount      float64 `json:"amount"`
}

type placeBidResponse struct {
	Bid models.Bid `json:"bid"`
}

type bidWithProfile struct {
	models.Bid
	Profiles *struct {
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
	} `json:"profiles"`
}

// List handles GET /api/bids/{livestockId}.
func (h *BidHandler) List(w http.ResponseWriter, r *http.Request) {
	livestockID := r.PathValue("livestockId")
	if livestockID == "" {
		writeJSON(w, http.StatusBadRequest, errorBody("missing livestock id"))
		return
	}

	rows, err := h.db.Pool.Query(r.Context(),
		`SELECT b.id, b.livestock_id, b.user_id, b.amount, b.is_winner, b.created_at,
		        p.first_name, p.last_name
		 FROM bids b
		 JOIN profiles p ON p.id = b.user_id
		 WHERE b.livestock_id = $1
		 ORDER BY b.amount DESC LIMIT 100`, livestockID,
	)
	if err != nil {
		slog.Error("failed to list bids", "livestock_id", livestockID, "error", err)
		writeJSON(w, http.StatusInternalServerError, errorBody("internal server error"))
		return
	}
	defer rows.Close()

	bids := []bidWithProfile{}
	for rows.Next() {
		var b bidWithProfile
		var firstName, lastName string
		if err := rows.Scan(&b.ID, &b.LivestockID, &b.UserID, &b.Amount, &b.IsWinner, &b.CreatedAt, &firstName, &lastName); err != nil {
			slog.Error("failed to scan bid row", "error", err)
			writeJSON(w, http.StatusInternalServerError, errorBody("internal server error"))
			return
		}
		b.Profiles = &struct {
			FirstName string `json:"first_name"`
			LastName  string `json:"last_name"`
		}{FirstName: firstName, LastName: lastName}
		bids = append(bids, b)
	}
	if err := rows.Err(); err != nil {
		slog.Error("bid row iteration error", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorBody("internal server error"))
		return
	}

	writeJSON(w, http.StatusOK, bids)
}

// Place handles POST /api/bids.
func (h *BidHandler) Place(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errorBody("unauthorized"))
		return
	}

	var req placeBidRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorBody("invalid request body"))
		return
	}

	if req.LivestockID == "" || req.Amount <= 0 {
		writeJSON(w, http.StatusBadRequest, errorBody("livestock_id and a positive amount are required"))
		return
	}

	// Fetch the listing to validate auction state.
	var sellerID, status string
	var currentBid float64
	var endTime time.Time

	err := h.db.Pool.QueryRow(r.Context(),
		`SELECT seller_id, status, current_bid, end_time FROM livestock_items WHERE id = $1`,
		req.LivestockID,
	).Scan(&sellerID, &status, &currentBid, &endTime)
	if err != nil {
		slog.Error("failed to fetch livestock for bid", "livestock_id", req.LivestockID, "error", err)
		writeJSON(w, http.StatusNotFound, errorBody("listing not found"))
		return
	}

	if status != "active" {
		writeJSON(w, http.StatusBadRequest, errorBody("auction is not active"))
		return
	}

	if time.Now().After(endTime) {
		writeJSON(w, http.StatusBadRequest, errorBody("auction has expired"))
		return
	}

	if sellerID == claims.UserID {
		writeJSON(w, http.StatusBadRequest, errorBody("cannot bid on your own listing"))
		return
	}

	if req.Amount <= currentBid {
		writeJSON(w, http.StatusBadRequest, errorBody("bid must be higher than current bid"))
		return
	}

	// Place bid atomically
	bid, err := h.db.PlaceBid(r.Context(), req.LivestockID, claims.UserID, req.Amount)
	if err != nil {
		slog.Error("place_bid failed", "livestock_id", req.LivestockID, "user_id", claims.UserID, "error", err)
		writeJSON(w, http.StatusConflict, errorBody("failed to place bid: "+err.Error()))
		return
	}

	writeJSON(w, http.StatusCreated, placeBidResponse{Bid: *bid})
}
