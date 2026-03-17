package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/zimlivestock/backend/internal/database"
	"github.com/zimlivestock/backend/internal/middleware"
	"github.com/zimlivestock/backend/internal/models"
)

// LivestockHandler provides HTTP handlers for livestock CRUD endpoints.
type LivestockHandler struct {
	db *database.DB
}

// NewLivestockHandler creates a new LivestockHandler.
func NewLivestockHandler(db *database.DB) *LivestockHandler {
	return &LivestockHandler{db: db}
}

type createListingRequest struct {
	Title         string   `json:"title"`
	Category      string   `json:"category"`
	Breed         string   `json:"breed"`
	Age           string   `json:"age"`
	Weight        string   `json:"weight"`
	Description   string   `json:"description"`
	Location      string   `json:"location"`
	Health        string   `json:"health"`
	StartingPrice float64  `json:"starting_price"`
	ImageURLs     []string `json:"image_urls"`
	DurationDays  int      `json:"duration_days"`
}

type livestockWithSeller struct {
	models.LivestockItem
	Seller profilePayload `json:"seller"`
}

// List handles GET /api/livestock.
func (h *LivestockHandler) List(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")
	location := r.URL.Query().Get("location")
	limitStr := r.URL.Query().Get("limit")

	limit := 50
	if limitStr != "" {
		if v, err := strconv.Atoi(limitStr); err == nil && v > 0 && v <= 100 {
			limit = v
		}
	}

	query := `SELECT id, title, category, breed, age, weight, description, location, health,
	                 starting_price, current_bid, bid_count, view_count, image_urls,
	                 seller_id, status, duration_days, end_time, created_at
	          FROM livestock_items
	          WHERE status = 'active' AND end_time > now()`

	args := []any{}
	argIdx := 1

	if category != "" {
		query += ` AND category = $` + strconv.Itoa(argIdx)
		args = append(args, category)
		argIdx++
	}
	if location != "" {
		query += ` AND location = $` + strconv.Itoa(argIdx)
		args = append(args, location)
		argIdx++
	}

	query += ` ORDER BY created_at DESC LIMIT $` + strconv.Itoa(argIdx)
	args = append(args, limit)

	rows, err := h.db.Pool.Query(r.Context(), query, args...)
	if err != nil {
		slog.Error("failed to list livestock", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorBody("internal server error"))
		return
	}
	defer rows.Close()

	items := []models.LivestockItem{}
	for rows.Next() {
		var item models.LivestockItem
		if err := rows.Scan(
			&item.ID, &item.Title, &item.Category, &item.Breed, &item.Age,
			&item.Weight, &item.Description, &item.Location, &item.Health,
			&item.StartingPrice, &item.CurrentBid, &item.BidCount, &item.ViewCount,
			&item.ImageURLs, &item.SellerID, &item.Status, &item.DurationDays,
			&item.EndTime, &item.CreatedAt,
		); err != nil {
			slog.Error("failed to scan livestock row", "error", err)
			writeJSON(w, http.StatusInternalServerError, errorBody("internal server error"))
			return
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		slog.Error("row iteration error", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorBody("internal server error"))
		return
	}

	writeJSON(w, http.StatusOK, items)
}

// Get handles GET /api/livestock/{id}.
func (h *LivestockHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, errorBody("missing livestock id"))
		return
	}

	var item models.LivestockItem
	err := h.db.Pool.QueryRow(r.Context(),
		`SELECT id, title, category, breed, age, weight, description, location, health,
		        starting_price, current_bid, bid_count, view_count, image_urls,
		        seller_id, status, duration_days, end_time, created_at
		 FROM livestock_items WHERE id = $1`, id,
	).Scan(
		&item.ID, &item.Title, &item.Category, &item.Breed, &item.Age,
		&item.Weight, &item.Description, &item.Location, &item.Health,
		&item.StartingPrice, &item.CurrentBid, &item.BidCount, &item.ViewCount,
		&item.ImageURLs, &item.SellerID, &item.Status, &item.DurationDays,
		&item.EndTime, &item.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			writeJSON(w, http.StatusNotFound, errorBody("livestock not found"))
			return
		}
		slog.Error("failed to get livestock", "id", id, "error", err)
		writeJSON(w, http.StatusInternalServerError, errorBody("internal server error"))
		return
	}

	// Increment view count in the background.
	go func() {
		_, _ = h.db.Pool.Exec(r.Context(),
			`UPDATE livestock_items SET view_count = view_count + 1 WHERE id = $1`, id)
	}()

	// Fetch seller info.
	var seller models.Profile
	err = h.db.Pool.QueryRow(r.Context(),
		`SELECT id, email, first_name, last_name, phone, verified, rating, sales_count, created_at
		 FROM profiles WHERE id = $1`, item.SellerID,
	).Scan(
		&seller.ID, &seller.Email, &seller.FirstName, &seller.LastName,
		&seller.Phone, &seller.Verified, &seller.Rating, &seller.SalesCount,
		&seller.CreatedAt,
	)
	if err != nil {
		slog.Error("failed to fetch seller", "seller_id", item.SellerID, "error", err)
		writeJSON(w, http.StatusInternalServerError, errorBody("internal server error"))
		return
	}

	writeJSON(w, http.StatusOK, livestockWithSeller{
		LivestockItem: item,
		Seller:        toProfilePayload(seller),
	})
}

// Create handles POST /api/livestock.
func (h *LivestockHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errorBody("unauthorized"))
		return
	}

	var req createListingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorBody("invalid request body"))
		return
	}

	if req.Title == "" || req.Category == "" || req.StartingPrice <= 0 || req.DurationDays <= 0 {
		writeJSON(w, http.StatusBadRequest, errorBody("title, category, starting_price (>0) and duration_days (>0) are required"))
		return
	}

	endTime := time.Now().Add(time.Duration(req.DurationDays) * 24 * time.Hour)

	if req.ImageURLs == nil {
		req.ImageURLs = []string{}
	}

	var item models.LivestockItem
	err := h.db.Pool.QueryRow(r.Context(),
		`INSERT INTO livestock_items
		 (title, category, breed, age, weight, description, location, health,
		  starting_price, current_bid, image_urls, seller_id, status, duration_days, end_time)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'active',$13,$14)
		 RETURNING id, title, category, breed, age, weight, description, location, health,
		           starting_price, current_bid, bid_count, view_count, image_urls,
		           seller_id, status, duration_days, end_time, created_at`,
		req.Title, req.Category, req.Breed, req.Age, req.Weight,
		req.Description, req.Location, req.Health,
		req.StartingPrice, req.StartingPrice, req.ImageURLs,
		claims.UserID, req.DurationDays, endTime,
	).Scan(
		&item.ID, &item.Title, &item.Category, &item.Breed, &item.Age,
		&item.Weight, &item.Description, &item.Location, &item.Health,
		&item.StartingPrice, &item.CurrentBid, &item.BidCount, &item.ViewCount,
		&item.ImageURLs, &item.SellerID, &item.Status, &item.DurationDays,
		&item.EndTime, &item.CreatedAt,
	)
	if err != nil {
		slog.Error("failed to create livestock listing", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorBody("internal server error"))
		return
	}

	writeJSON(w, http.StatusCreated, item)
}

// Delete handles DELETE /api/livestock/{id}.
func (h *LivestockHandler) Delete(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errorBody("unauthorized"))
		return
	}

	id := r.PathValue("id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, errorBody("missing livestock id"))
		return
	}

	result, err := h.db.Pool.Exec(r.Context(),
		`DELETE FROM livestock_items WHERE id = $1 AND seller_id = $2`, id, claims.UserID)
	if err != nil {
		slog.Error("failed to delete livestock", "id", id, "error", err)
		writeJSON(w, http.StatusInternalServerError, errorBody("internal server error"))
		return
	}

	if result.RowsAffected() == 0 {
		// Check if listing exists but belongs to someone else
		var exists bool
		h.db.Pool.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM livestock_items WHERE id = $1)`, id).Scan(&exists)
		if exists {
			writeJSON(w, http.StatusForbidden, errorBody("you can only delete your own listings"))
			return
		}
		writeJSON(w, http.StatusNotFound, errorBody("listing not found"))
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "listing deleted"})
}
