package database

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/zimlivestock/backend/internal/models"
)

// GetLivestockByID returns a single livestock item by its UUID.
func (db *DB) GetLivestockByID(ctx context.Context, id string) (*models.LivestockItem, error) {
	query := `
		SELECT id, title, category, breed, age, weight, description, location,
		       health, starting_price, current_bid, bid_count, view_count,
		       image_urls, seller_id, status, duration_days, end_time, created_at
		FROM livestock_items
		WHERE id = $1`

	var item models.LivestockItem
	err := db.Pool.QueryRow(ctx, query, id).Scan(
		&item.ID, &item.Title, &item.Category, &item.Breed,
		&item.Age, &item.Weight, &item.Description, &item.Location,
		&item.Health, &item.StartingPrice, &item.CurrentBid,
		&item.BidCount, &item.ViewCount, &item.ImageURLs,
		&item.SellerID, &item.Status, &item.DurationDays,
		&item.EndTime, &item.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("livestock item not found: %s", id)
		}
		return nil, fmt.Errorf("query livestock item: %w", err)
	}

	return &item, nil
}

// ListActiveLivestock returns active livestock items with optional category and location filters.
// Pass empty strings to skip a filter. Limit controls max results (capped at 100).
func (db *DB) ListActiveLivestock(ctx context.Context, category, location string, limit int) ([]models.LivestockItem, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	query := `
		SELECT id, title, category, breed, age, weight, description, location,
		       health, starting_price, current_bid, bid_count, view_count,
		       image_urls, seller_id, status, duration_days, end_time, created_at
		FROM livestock_items
		WHERE status = 'active'
		  AND end_time > now()
		  AND ($1::text = '' OR category = $1)
		  AND ($2::text = '' OR location = $2)
		ORDER BY created_at DESC
		LIMIT $3`

	rows, err := db.Pool.Query(ctx, query, category, location, limit)
	if err != nil {
		return nil, fmt.Errorf("query active livestock: %w", err)
	}
	defer rows.Close()

	var items []models.LivestockItem
	for rows.Next() {
		var item models.LivestockItem
		if err := rows.Scan(
			&item.ID, &item.Title, &item.Category, &item.Breed,
			&item.Age, &item.Weight, &item.Description, &item.Location,
			&item.Health, &item.StartingPrice, &item.CurrentBid,
			&item.BidCount, &item.ViewCount, &item.ImageURLs,
			&item.SellerID, &item.Status, &item.DurationDays,
			&item.EndTime, &item.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan livestock row: %w", err)
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate livestock rows: %w", err)
	}

	return items, nil
}

// PlaceBid atomically places a bid using a transaction. It validates the auction
// is active, the bid exceeds the current highest, and the bidder is not the seller.
func (db *DB) PlaceBid(ctx context.Context, livestockID, userID string, amount float64) (*models.Bid, error) {
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Lock the listing row to prevent concurrent bid races.
	var item models.LivestockItem
	err = tx.QueryRow(ctx, `
		SELECT id, seller_id, status, end_time, current_bid, starting_price
		FROM livestock_items
		WHERE id = $1
		FOR UPDATE`, livestockID,
	).Scan(&item.ID, &item.SellerID, &item.Status, &item.EndTime, &item.CurrentBid, &item.StartingPrice)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("listing not found")
		}
		return nil, fmt.Errorf("lock listing: %w", err)
	}

	if item.Status != "active" {
		return nil, fmt.Errorf("auction is not active")
	}

	if item.SellerID == userID {
		return nil, fmt.Errorf("cannot bid on your own listing")
	}

	if amount <= item.CurrentBid {
		return nil, fmt.Errorf("bid must be higher than current bid of %.2f", item.CurrentBid)
	}

	if amount < item.StartingPrice {
		return nil, fmt.Errorf("bid must be at least the starting price of %.2f", item.StartingPrice)
	}

	// Insert the bid.
	bidID := uuid.New().String()
	var bid models.Bid
	err = tx.QueryRow(ctx, `
		INSERT INTO bids (id, livestock_id, user_id, amount)
		VALUES ($1, $2, $3, $4)
		RETURNING id, livestock_id, user_id, amount, is_winner, created_at`,
		bidID, livestockID, userID, amount,
	).Scan(&bid.ID, &bid.LivestockID, &bid.UserID, &bid.Amount, &bid.IsWinner, &bid.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert bid: %w", err)
	}

	// Update the listing's current bid and count atomically.
	_, err = tx.Exec(ctx, `
		UPDATE livestock_items
		SET current_bid = $1, bid_count = bid_count + 1
		WHERE id = $2`, amount, livestockID)
	if err != nil {
		return nil, fmt.Errorf("update listing bid: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit transaction: %w", err)
	}

	return &bid, nil
}

// SyncListingBid recalculates a listing's current_bid and bid_count from the bids table.
// Useful for correcting drift or after manual bid adjustments.
func (db *DB) SyncListingBid(ctx context.Context, livestockID string) error {
	_, err := db.Pool.Exec(ctx, `
		UPDATE livestock_items
		SET current_bid = COALESCE((SELECT MAX(amount) FROM bids WHERE livestock_id = $1), 0),
		    bid_count    = (SELECT COUNT(*) FROM bids WHERE livestock_id = $1)
		WHERE id = $1`, livestockID)
	if err != nil {
		return fmt.Errorf("sync listing bid: %w", err)
	}
	return nil
}

// CreatePayment inserts a new payment record. The ID is generated if empty.
func (db *DB) CreatePayment(ctx context.Context, payment *models.Payment) error {
	if payment.ID == "" {
		payment.ID = uuid.New().String()
	}

	_, err := db.Pool.Exec(ctx, `
		INSERT INTO payments (id, user_id, livestock_id, reference, amount, method, status, paynow_reference, phone)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		payment.ID, payment.UserID, payment.LivestockID, payment.Reference,
		payment.Amount, payment.Method, payment.Status,
		payment.PaynowReference, payment.Phone,
	)
	if err != nil {
		return fmt.Errorf("insert payment: %w", err)
	}
	return nil
}

// UpdatePaymentStatus sets a payment's status and triggers the updated_at column.
func (db *DB) UpdatePaymentStatus(ctx context.Context, id, status string) error {
	tag, err := db.Pool.Exec(ctx, `
		UPDATE payments SET status = $1, updated_at = now() WHERE id = $2`,
		status, id)
	if err != nil {
		return fmt.Errorf("update payment status: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("payment not found: %s", id)
	}
	return nil
}

// GetAgentsByUserID returns all agents belonging to a user.
func (db *DB) GetAgentsByUserID(ctx context.Context, userID string) ([]models.Agent, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT id, user_id, agent_type, name, status, config, stats,
		       last_run_at, created_at, updated_at
		FROM agents
		WHERE user_id = $1
		ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("query agents: %w", err)
	}
	defer rows.Close()

	var agents []models.Agent
	for rows.Next() {
		var a models.Agent
		var configBytes, statsBytes []byte
		if err := rows.Scan(
			&a.ID, &a.UserID, &a.AgentType, &a.Name, &a.Status,
			&configBytes, &statsBytes, &a.LastRunAt, &a.CreatedAt, &a.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan agent row: %w", err)
		}
		a.Config = make(map[string]any)
		a.Stats = make(map[string]any)
		if len(configBytes) > 0 {
			_ = json.Unmarshal(configBytes, &a.Config)
		}
		if len(statsBytes) > 0 {
			_ = json.Unmarshal(statsBytes, &a.Stats)
		}
		agents = append(agents, a)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate agent rows: %w", err)
	}

	return agents, nil
}

// CreateAgent inserts a new agent. The ID is generated if empty.
func (db *DB) CreateAgent(ctx context.Context, agent *models.Agent) error {
	if agent.ID == "" {
		agent.ID = uuid.New().String()
	}

	configJSON, err := json.Marshal(agent.Config)
	if err != nil {
		return fmt.Errorf("marshal agent config: %w", err)
	}
	statsJSON, err := json.Marshal(agent.Stats)
	if err != nil {
		return fmt.Errorf("marshal agent stats: %w", err)
	}

	_, err = db.Pool.Exec(ctx, `
		INSERT INTO agents (id, user_id, agent_type, name, status, config, stats)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		agent.ID, agent.UserID, agent.AgentType, agent.Name,
		agent.Status, configJSON, statsJSON,
	)
	if err != nil {
		return fmt.Errorf("insert agent: %w", err)
	}
	return nil
}

// GetAgentGoals returns all goals for a given agent.
func (db *DB) GetAgentGoals(ctx context.Context, agentID string) ([]models.AgentGoal, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT id, agent_id, category, preferred_breed, preferred_location,
		       min_health, max_price, quantity, quantity_fulfilled, status, created_at
		FROM agent_goals
		WHERE agent_id = $1
		ORDER BY created_at DESC`, agentID)
	if err != nil {
		return nil, fmt.Errorf("query agent goals: %w", err)
	}
	defer rows.Close()

	var goals []models.AgentGoal
	for rows.Next() {
		var g models.AgentGoal
		if err := rows.Scan(
			&g.ID, &g.AgentID, &g.Category, &g.PreferredBreed,
			&g.PreferredLocation, &g.MinHealth, &g.MaxPrice,
			&g.Quantity, &g.QuantityFulfilled, &g.Status, &g.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan agent goal row: %w", err)
		}
		goals = append(goals, g)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate agent goal rows: %w", err)
	}

	return goals, nil
}

// LogAgentActivity appends an entry to the agent_activity_log table.
func (db *DB) LogAgentActivity(ctx context.Context, agentID, eventType, message string, metadata map[string]any) error {
	metaJSON, err := json.Marshal(metadata)
	if err != nil {
		return fmt.Errorf("marshal activity metadata: %w", err)
	}

	_, err = db.Pool.Exec(ctx, `
		INSERT INTO agent_activity_log (agent_id, event_type, message, metadata)
		VALUES ($1, $2, $3, $4)`,
		agentID, eventType, message, metaJSON,
	)
	if err != nil {
		return fmt.Errorf("insert agent activity: %w", err)
	}
	return nil
}
