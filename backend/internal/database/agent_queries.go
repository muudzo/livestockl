package database

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/zimlivestock/backend/internal/models"
)

// GetAgentByID returns a single agent by its UUID.
func (db *DB) GetAgentByID(ctx context.Context, id string) (*models.Agent, error) {
	var a models.Agent
	var configBytes, statsBytes []byte
	err := db.Pool.QueryRow(ctx, `
		SELECT id, user_id, agent_type, name, status, config, stats,
		       last_run_at, created_at, updated_at
		FROM agents
		WHERE id = $1`, id,
	).Scan(
		&a.ID, &a.UserID, &a.AgentType, &a.Name, &a.Status,
		&configBytes, &statsBytes, &a.LastRunAt, &a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("agent not found: %s", id)
		}
		return nil, fmt.Errorf("query agent: %w", err)
	}
	a.Config = make(map[string]any)
	a.Stats = make(map[string]any)
	if len(configBytes) > 0 {
		_ = json.Unmarshal(configBytes, &a.Config)
	}
	if len(statsBytes) > 0 {
		_ = json.Unmarshal(statsBytes, &a.Stats)
	}
	return &a, nil
}

// GetActiveAgents returns all agents with status 'idle' or 'running'.
func (db *DB) GetActiveAgents(ctx context.Context) ([]models.Agent, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT id, user_id, agent_type, name, status, config, stats,
		       last_run_at, created_at, updated_at
		FROM agents
		WHERE status IN ('idle', 'running')
		ORDER BY created_at`)
	if err != nil {
		return nil, fmt.Errorf("query active agents: %w", err)
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

// GetActiveGoals returns goals with status 'active' for a given agent.
func (db *DB) GetActiveGoals(ctx context.Context, agentID string) ([]models.AgentGoal, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT id, agent_id, category, preferred_breed, preferred_location,
		       min_health, max_price, quantity, quantity_fulfilled, status, created_at
		FROM agent_goals
		WHERE agent_id = $1 AND status = 'active'
		ORDER BY created_at`, agentID)
	if err != nil {
		return nil, fmt.Errorf("query active goals: %w", err)
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
			return nil, fmt.Errorf("scan goal row: %w", err)
		}
		goals = append(goals, g)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate goal rows: %w", err)
	}
	return goals, nil
}

// SearchLivestockForGoal finds active livestock matching the given goal criteria.
func (db *DB) SearchLivestockForGoal(ctx context.Context, goal models.AgentGoal) ([]models.LivestockItem, error) {
	query := `
		SELECT id, title, category, breed, age, weight, description, location,
		       health, starting_price, current_bid, bid_count, view_count,
		       image_urls, seller_id, status, duration_days, end_time, created_at
		FROM livestock_items
		WHERE status = 'active'
		  AND end_time > now()
		  AND category = $1
		  AND ($2::text IS NULL OR location = $2)
		  AND ($3::text IS NULL OR breed = $3)
		  AND ($4::numeric IS NULL OR GREATEST(current_bid, starting_price) <= $4)
		ORDER BY created_at DESC
		LIMIT 50`

	var location, breed *string
	var maxPrice *float64
	if goal.PreferredLocation != nil {
		location = goal.PreferredLocation
	}
	if goal.PreferredBreed != nil {
		breed = goal.PreferredBreed
	}
	if goal.MaxPrice != nil {
		maxPrice = goal.MaxPrice
	}

	rows, err := db.Pool.Query(ctx, query, goal.Category, location, breed, maxPrice)
	if err != nil {
		return nil, fmt.Errorf("search livestock for goal: %w", err)
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

// FindEndingSoonAuctions returns active auctions ending within the given duration
// that match the specified category and optional filters.
func (db *DB) FindEndingSoonAuctions(ctx context.Context, within time.Duration, category string, location, breed *string, maxPrice *float64) ([]models.LivestockItem, error) {
	query := `
		SELECT id, title, category, breed, age, weight, description, location,
		       health, starting_price, current_bid, bid_count, view_count,
		       image_urls, seller_id, status, duration_days, end_time, created_at
		FROM livestock_items
		WHERE status = 'active'
		  AND end_time > now()
		  AND end_time <= now() + $1::interval
		  AND category = $2
		  AND ($3::text IS NULL OR location = $3)
		  AND ($4::text IS NULL OR breed = $4)
		  AND ($5::numeric IS NULL OR GREATEST(current_bid, starting_price) <= $5)
		ORDER BY end_time ASC
		LIMIT 20`

	interval := fmt.Sprintf("%d seconds", int(within.Seconds()))
	rows, err := db.Pool.Query(ctx, query, interval, category, location, breed, maxPrice)
	if err != nil {
		return nil, fmt.Errorf("find ending soon auctions: %w", err)
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
			return nil, fmt.Errorf("scan ending soon row: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate ending soon rows: %w", err)
	}
	return items, nil
}

// RecordAgentDecision inserts a row into agent_decisions. The ID is auto-generated if empty.
func (db *DB) RecordAgentDecision(ctx context.Context, d *models.AgentDecision) error {
	if d.ID == "" {
		d.ID = uuid.New().String()
	}
	metaJSON, err := json.Marshal(d.Metadata)
	if err != nil {
		return fmt.Errorf("marshal decision metadata: %w", err)
	}
	_, err = db.Pool.Exec(ctx, `
		INSERT INTO agent_decisions (id, agent_id, goal_id, livestock_id, decision, reasoning, confidence, metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		d.ID, d.AgentID, d.GoalID, d.LivestockID, d.Decision, d.Reasoning, d.Confidence, metaJSON,
	)
	if err != nil {
		return fmt.Errorf("insert agent decision: %w", err)
	}
	return nil
}

// RecordAgentBid inserts a row into agent_bids. The ID is auto-generated if empty.
func (db *DB) RecordAgentBid(ctx context.Context, ab *models.AgentBid) error {
	if ab.ID == "" {
		ab.ID = uuid.New().String()
	}
	_, err := db.Pool.Exec(ctx, `
		INSERT INTO agent_bids (id, agent_id, goal_id, livestock_id, bid_id, amount, strategy, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		ab.ID, ab.AgentID, ab.GoalID, ab.LivestockID, ab.BidID, ab.Amount, ab.Strategy, ab.Status,
	)
	if err != nil {
		return fmt.Errorf("insert agent bid: %w", err)
	}
	return nil
}

// GetAgentBidsByStatus returns all agent_bids for a given agent filtered by status.
func (db *DB) GetAgentBidsByStatus(ctx context.Context, agentID, status string) ([]models.AgentBid, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT id, agent_id, goal_id, livestock_id, bid_id, amount, strategy, status, created_at
		FROM agent_bids
		WHERE agent_id = $1 AND status = $2
		ORDER BY created_at DESC`, agentID, status)
	if err != nil {
		return nil, fmt.Errorf("query agent bids: %w", err)
	}
	defer rows.Close()

	var bids []models.AgentBid
	for rows.Next() {
		var b models.AgentBid
		if err := rows.Scan(
			&b.ID, &b.AgentID, &b.GoalID, &b.LivestockID, &b.BidID,
			&b.Amount, &b.Strategy, &b.Status, &b.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan agent bid row: %w", err)
		}
		bids = append(bids, b)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate agent bid rows: %w", err)
	}
	return bids, nil
}

// UpdateAgentBidStatus sets the status of an agent_bid row.
func (db *DB) UpdateAgentBidStatus(ctx context.Context, agentBidID, status string) error {
	tag, err := db.Pool.Exec(ctx, `
		UPDATE agent_bids SET status = $1 WHERE id = $2`, status, agentBidID)
	if err != nil {
		return fmt.Errorf("update agent bid status: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("agent bid not found: %s", agentBidID)
	}
	return nil
}

// GetHighestBidForListing returns the highest bid for a livestock item.
func (db *DB) GetHighestBidForListing(ctx context.Context, livestockID string) (*models.Bid, error) {
	var b models.Bid
	err := db.Pool.QueryRow(ctx, `
		SELECT id, livestock_id, user_id, amount, is_winner, created_at
		FROM bids
		WHERE livestock_id = $1
		ORDER BY amount DESC
		LIMIT 1`, livestockID,
	).Scan(&b.ID, &b.LivestockID, &b.UserID, &b.Amount, &b.IsWinner, &b.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("query highest bid: %w", err)
	}
	return &b, nil
}

// UpdateAgentLastRun sets the agent's last_run_at to now and status to the given value.
func (db *DB) UpdateAgentLastRun(ctx context.Context, agentID, status string) error {
	_, err := db.Pool.Exec(ctx, `
		UPDATE agents SET last_run_at = now(), status = $1, updated_at = now()
		WHERE id = $2`, status, agentID)
	if err != nil {
		return fmt.Errorf("update agent last run: %w", err)
	}
	return nil
}

// HasAgentBidOnListing checks if the agent already has a placed bid on the listing.
func (db *DB) HasAgentBidOnListing(ctx context.Context, agentID, livestockID string) (bool, error) {
	var count int
	err := db.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM agent_bids
		WHERE agent_id = $1 AND livestock_id = $2 AND status IN ('placed', 'won')`,
		agentID, livestockID,
	).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("check agent bid exists: %w", err)
	}
	return count > 0, nil
}

// CreateAgentPaymentOrder inserts a payment order for an agent win.
func (db *DB) CreateAgentPaymentOrder(ctx context.Context, order *models.AgentPaymentOrder) error {
	if order.ID == "" {
		order.ID = uuid.New().String()
	}
	_, err := db.Pool.Exec(ctx, `
		INSERT INTO agent_payment_orders (id, agent_id, agent_bid_id, livestock_id, user_id, amount, method, status, max_attempts)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		order.ID, order.AgentID, order.AgentBidID, order.LivestockID, order.UserID,
		order.Amount, order.Method, order.Status, order.MaxAttempts,
	)
	if err != nil {
		return fmt.Errorf("insert agent payment order: %w", err)
	}
	return nil
}
