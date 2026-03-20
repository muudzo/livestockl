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

	if time.Now().After(item.EndTime) {
		return nil, fmt.Errorf("auction has expired")
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

// ── Favorites ───────────────────────────────────────────────

func (db *DB) GetFavoriteIDs(ctx context.Context, userID string) ([]string, error) {
	rows, err := db.Pool.Query(ctx, `SELECT livestock_id FROM favorites WHERE user_id = $1`, userID)
	if err != nil {
		return nil, fmt.Errorf("query favorites: %w", err)
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scan favorite: %w", err)
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func (db *DB) ToggleFavorite(ctx context.Context, userID, livestockID string) (bool, error) {
	var exists bool
	err := db.Pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM favorites WHERE user_id = $1 AND livestock_id = $2)`,
		userID, livestockID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check favorite: %w", err)
	}
	if exists {
		_, err = db.Pool.Exec(ctx, `DELETE FROM favorites WHERE user_id = $1 AND livestock_id = $2`, userID, livestockID)
		return false, err
	}
	_, err = db.Pool.Exec(ctx, `INSERT INTO favorites (user_id, livestock_id) VALUES ($1, $2)`, userID, livestockID)
	return true, err
}

// ── Notifications ───────────────────────────────────────────

func (db *DB) GetNotifications(ctx context.Context, userID string) ([]models.Notification, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT id, user_id, type, title, message, read, priority, created_at
		FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("query notifications: %w", err)
	}
	defer rows.Close()
	var notifs []models.Notification
	for rows.Next() {
		var n models.Notification
		if err := rows.Scan(&n.ID, &n.UserID, &n.Type, &n.Title, &n.Message, &n.Read, &n.Priority, &n.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan notification: %w", err)
		}
		notifs = append(notifs, n)
	}
	return notifs, rows.Err()
}

func (db *DB) GetUnreadCount(ctx context.Context, userID string) (int, error) {
	var count int
	err := db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false`, userID).Scan(&count)
	return count, err
}

func (db *DB) MarkAllNotificationsRead(ctx context.Context, userID string) error {
	_, err := db.Pool.Exec(ctx, `UPDATE notifications SET read = true WHERE user_id = $1 AND read = false`, userID)
	return err
}

func (db *DB) DeleteNotification(ctx context.Context, id, userID string) error {
	tag, err := db.Pool.Exec(ctx, `DELETE FROM notifications WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return fmt.Errorf("delete notification: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("notification not found")
	}
	return nil
}

// ── My Listings ─────────────────────────────────────────────

func (db *DB) GetMyListings(ctx context.Context, userID string, limit int) ([]models.LivestockItem, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	rows, err := db.Pool.Query(ctx, `
		SELECT id, title, category, breed, age, weight, description, location,
		       health, starting_price, current_bid, bid_count, view_count,
		       image_urls, seller_id, status, duration_days, end_time, created_at
		FROM livestock_items WHERE seller_id = $1
		ORDER BY created_at DESC LIMIT $2`, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("query my listings: %w", err)
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
			return nil, fmt.Errorf("scan my listing: %w", err)
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

// ── Won Items ───────────────────────────────────────────────

func (db *DB) GetWonItems(ctx context.Context, userID string) ([]models.LivestockItem, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT li.id, li.title, li.category, li.breed, li.age, li.weight,
		       li.description, li.location, li.health, li.starting_price,
		       li.current_bid, li.bid_count, li.view_count, li.image_urls,
		       li.seller_id, li.status, li.duration_days, li.end_time, li.created_at
		FROM bids b
		JOIN livestock_items li ON li.id = b.livestock_id
		WHERE b.user_id = $1 AND b.is_winner = true
		ORDER BY b.created_at DESC LIMIT 50`, userID)
	if err != nil {
		return nil, fmt.Errorf("query won items: %w", err)
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
			return nil, fmt.Errorf("scan won item: %w", err)
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

// ── Update Listing ──────────────────────────────────────────

func (db *DB) UpdateListing(ctx context.Context, id, sellerID string, updates map[string]any) (*models.LivestockItem, error) {
	// Build dynamic SET clause
	allowed := map[string]bool{
		"title": true, "breed": true, "age": true, "weight": true,
		"description": true, "location": true, "health": true,
		"starting_price": true, "image_urls": true,
	}
	setClauses := []string{}
	args := []any{}
	argIdx := 1

	for key, val := range updates {
		if !allowed[key] {
			continue
		}
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", key, argIdx))
		args = append(args, val)
		argIdx++
	}

	if len(setClauses) == 0 {
		return nil, fmt.Errorf("no valid fields to update")
	}

	// If starting_price is being updated, check no bids exist
	if _, ok := updates["starting_price"]; ok {
		var bidCount int
		err := db.Pool.QueryRow(ctx, `SELECT bid_count FROM livestock_items WHERE id = $1 AND seller_id = $2`, id, sellerID).Scan(&bidCount)
		if err != nil {
			return nil, fmt.Errorf("check bid count: %w", err)
		}
		if bidCount > 0 {
			return nil, fmt.Errorf("cannot change starting price after bids have been placed")
		}
	}

	query := fmt.Sprintf(`UPDATE livestock_items SET %s WHERE id = $%d AND seller_id = $%d
		RETURNING id, title, category, breed, age, weight, description, location,
		          health, starting_price, current_bid, bid_count, view_count,
		          image_urls, seller_id, status, duration_days, end_time, created_at`,
		joinStrings(setClauses, ", "), argIdx, argIdx+1)
	args = append(args, id, sellerID)

	var item models.LivestockItem
	err := db.Pool.QueryRow(ctx, query, args...).Scan(
		&item.ID, &item.Title, &item.Category, &item.Breed,
		&item.Age, &item.Weight, &item.Description, &item.Location,
		&item.Health, &item.StartingPrice, &item.CurrentBid,
		&item.BidCount, &item.ViewCount, &item.ImageURLs,
		&item.SellerID, &item.Status, &item.DurationDays,
		&item.EndTime, &item.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("update listing: %w", err)
	}
	return &item, nil
}

func joinStrings(strs []string, sep string) string {
	result := ""
	for i, s := range strs {
		if i > 0 {
			result += sep
		}
		result += s
	}
	return result
}

// ── View Count ──────────────────────────────────────────────

func (db *DB) IncrementViewCount(ctx context.Context, itemID string) error {
	_, err := db.Pool.Exec(ctx, `UPDATE livestock_items SET view_count = view_count + 1 WHERE id = $1`, itemID)
	return err
}

// ── Conversations ───────────────────────────────────────────

func (db *DB) GetConversations(ctx context.Context, userID string) ([]models.Conversation, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT c.id, c.participant_1, c.participant_2, c.livestock_id,
		       c.last_message_at, c.created_at,
		       CASE WHEN c.participant_1 = $1 THEN p2.first_name ELSE p1.first_name END,
		       CASE WHEN c.participant_1 = $1 THEN p2.last_name ELSE p1.last_name END,
		       li.title
		FROM conversations c
		JOIN profiles p1 ON p1.id = c.participant_1
		JOIN profiles p2 ON p2.id = c.participant_2
		LEFT JOIN livestock_items li ON li.id = c.livestock_id
		WHERE c.participant_1 = $1 OR c.participant_2 = $1
		ORDER BY c.last_message_at DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("query conversations: %w", err)
	}
	defer rows.Close()

	var convs []models.Conversation
	for rows.Next() {
		var c models.Conversation
		var otherFirst, otherLast string
		var livestockTitle *string
		if err := rows.Scan(&c.ID, &c.Participant1, &c.Participant2, &c.LivestockID,
			&c.LastMessageAt, &c.CreatedAt, &otherFirst, &otherLast, &livestockTitle); err != nil {
			return nil, fmt.Errorf("scan conversation: %w", err)
		}
		c.OtherParticipant = &models.Profile{FirstName: otherFirst, LastName: otherLast}
		c.LivestockTitle = livestockTitle
		convs = append(convs, c)
	}

	// Fetch last messages
	if len(convs) > 0 {
		convIDs := make([]string, len(convs))
		for i, c := range convs {
			convIDs[i] = c.ID
		}
		msgRows, err := db.Pool.Query(ctx, `
			SELECT DISTINCT ON (conversation_id) conversation_id, content
			FROM messages WHERE conversation_id = ANY($1)
			ORDER BY conversation_id, created_at DESC`, convIDs)
		if err == nil {
			defer msgRows.Close()
			lastMsgs := map[string]string{}
			for msgRows.Next() {
				var convID, content string
				if err := msgRows.Scan(&convID, &content); err == nil {
					lastMsgs[convID] = content
				}
			}
			for i := range convs {
				convs[i].LastMessage = lastMsgs[convs[i].ID]
			}
		}
	}

	return convs, rows.Err()
}

func (db *DB) StartConversation(ctx context.Context, userID, sellerID string, livestockID *string) (*models.Conversation, error) {
	// Ensure consistent ordering: lower UUID first
	p1, p2 := userID, sellerID
	if p1 > p2 {
		p1, p2 = p2, p1
	}

	// Try find existing
	var conv models.Conversation
	var err error
	if livestockID != nil {
		err = db.Pool.QueryRow(ctx, `
			SELECT id, participant_1, participant_2, livestock_id, last_message_at, created_at
			FROM conversations WHERE participant_1 = $1 AND participant_2 = $2 AND livestock_id = $3`,
			p1, p2, *livestockID).Scan(&conv.ID, &conv.Participant1, &conv.Participant2, &conv.LivestockID, &conv.LastMessageAt, &conv.CreatedAt)
	} else {
		err = db.Pool.QueryRow(ctx, `
			SELECT id, participant_1, participant_2, livestock_id, last_message_at, created_at
			FROM conversations WHERE participant_1 = $1 AND participant_2 = $2 AND livestock_id IS NULL`,
			p1, p2).Scan(&conv.ID, &conv.Participant1, &conv.Participant2, &conv.LivestockID, &conv.LastMessageAt, &conv.CreatedAt)
	}
	if err == nil {
		return &conv, nil
	}

	// Create new
	id := uuid.New().String()
	err = db.Pool.QueryRow(ctx, `
		INSERT INTO conversations (id, participant_1, participant_2, livestock_id)
		VALUES ($1, $2, $3, $4)
		RETURNING id, participant_1, participant_2, livestock_id, last_message_at, created_at`,
		id, p1, p2, livestockID).Scan(&conv.ID, &conv.Participant1, &conv.Participant2, &conv.LivestockID, &conv.LastMessageAt, &conv.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("create conversation: %w", err)
	}
	return &conv, nil
}

// ── Messages ────────────────────────────────────────────────

func (db *DB) GetMessages(ctx context.Context, conversationID string) ([]models.Message, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT id, conversation_id, sender_id, content, read, created_at
		FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`, conversationID)
	if err != nil {
		return nil, fmt.Errorf("query messages: %w", err)
	}
	defer rows.Close()
	var msgs []models.Message
	for rows.Next() {
		var m models.Message
		if err := rows.Scan(&m.ID, &m.ConversationID, &m.SenderID, &m.Content, &m.Read, &m.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan message: %w", err)
		}
		msgs = append(msgs, m)
	}
	return msgs, rows.Err()
}

func (db *DB) SendMessage(ctx context.Context, conversationID, senderID, content string) (*models.Message, error) {
	id := uuid.New().String()
	var msg models.Message
	err := db.Pool.QueryRow(ctx, `
		INSERT INTO messages (id, conversation_id, sender_id, content)
		VALUES ($1, $2, $3, $4)
		RETURNING id, conversation_id, sender_id, content, read, created_at`,
		id, conversationID, senderID, content).Scan(&msg.ID, &msg.ConversationID, &msg.SenderID, &msg.Content, &msg.Read, &msg.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("send message: %w", err)
	}
	// Update conversation last_message_at
	_, _ = db.Pool.Exec(ctx, `UPDATE conversations SET last_message_at = now() WHERE id = $1`, conversationID)
	return &msg, nil
}

// ── Payment queries ─────────────────────────────────────────

func (db *DB) GetPaymentsByUser(ctx context.Context, userID string, limit int) ([]models.Payment, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	rows, err := db.Pool.Query(ctx, `
		SELECT id, user_id, livestock_id, reference, amount, method, status,
		       paynow_reference, phone, created_at, updated_at
		FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("query payments: %w", err)
	}
	defer rows.Close()
	var payments []models.Payment
	for rows.Next() {
		var p models.Payment
		if err := rows.Scan(&p.ID, &p.UserID, &p.LivestockID, &p.Reference,
			&p.Amount, &p.Method, &p.Status, &p.PaynowReference,
			&p.Phone, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan payment: %w", err)
		}
		payments = append(payments, p)
	}
	return payments, rows.Err()
}

func (db *DB) GetPaymentByReference(ctx context.Context, reference string) (*models.Payment, error) {
	var p models.Payment
	err := db.Pool.QueryRow(ctx, `
		SELECT id, user_id, livestock_id, reference, amount, method, status,
		       paynow_reference, phone, created_at, updated_at
		FROM payments WHERE reference = $1`, reference).Scan(
		&p.ID, &p.UserID, &p.LivestockID, &p.Reference,
		&p.Amount, &p.Method, &p.Status, &p.PaynowReference,
		&p.Phone, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get payment by reference: %w", err)
	}
	return &p, nil
}

// ── Agent Payments & Market Intel ───────────────────────────

func (db *DB) GetAgentPayments(ctx context.Context, agentID string, limit int) ([]models.AgentPaymentOrder, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	rows, err := db.Pool.Query(ctx, `
		SELECT id, agent_id, agent_bid_id, livestock_id, user_id, amount, method,
		       status, attempt_count, max_attempts, last_error, paynow_reference,
		       created_at, paid_at, updated_at
		FROM agent_payment_orders WHERE agent_id = $1
		ORDER BY created_at DESC LIMIT $2`, agentID, limit)
	if err != nil {
		return nil, fmt.Errorf("query agent payments: %w", err)
	}
	defer rows.Close()
	var orders []models.AgentPaymentOrder
	for rows.Next() {
		var o models.AgentPaymentOrder
		if err := rows.Scan(&o.ID, &o.AgentID, &o.AgentBidID, &o.LivestockID, &o.UserID,
			&o.Amount, &o.Method, &o.Status, &o.AttemptCount, &o.MaxAttempts,
			&o.LastError, &o.PaynowReference, &o.CreatedAt, &o.PaidAt, &o.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan agent payment: %w", err)
		}
		orders = append(orders, o)
	}
	return orders, rows.Err()
}

// ── Market Intel ────────────────────────────────────────────

func (db *DB) GetMarketIntel(ctx context.Context, limit int) ([]map[string]any, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	// Generate live market intel from current data
	rows, err := db.Pool.Query(ctx, `
		SELECT category,
		       COUNT(*) as total_listings,
		       COALESCE(AVG(current_bid), 0) as avg_price,
		       COALESCE(SUM(bid_count), 0) as total_bids,
		       MODE() WITHIN GROUP (ORDER BY location) as top_location
		FROM livestock_items
		WHERE status = 'active' AND end_time > now()
		GROUP BY category
		ORDER BY total_listings DESC
		LIMIT $1`, limit)
	if err != nil {
		return nil, fmt.Errorf("query market intel: %w", err)
	}
	defer rows.Close()
	var results []map[string]any
	for rows.Next() {
		var category, topLocation string
		var totalListings, totalBids int
		var avgPrice float64
		if err := rows.Scan(&category, &totalListings, &avgPrice, &totalBids, &topLocation); err != nil {
			return nil, fmt.Errorf("scan market intel: %w", err)
		}
		results = append(results, map[string]any{
			"category":       category,
			"total_listings": totalListings,
			"avg_price":      avgPrice,
			"total_bids":     totalBids,
			"top_location":   topLocation,
		})
	}
	if results == nil {
		results = []map[string]any{}
	}
	return results, rows.Err()
}

// ── Get Livestock with Seller Profile ───────────────────────

func (db *DB) GetLivestockWithSeller(ctx context.Context, id string) (*models.LivestockItem, *models.Profile, error) {
	item, err := db.GetLivestockByID(ctx, id)
	if err != nil {
		return nil, nil, err
	}
	var seller models.Profile
	err = db.Pool.QueryRow(ctx, `
		SELECT id, email, first_name, last_name, phone, verified, rating, sales_count, created_at
		FROM profiles WHERE id = $1`, item.SellerID).Scan(
		&seller.ID, &seller.Email, &seller.FirstName, &seller.LastName,
		&seller.Phone, &seller.Verified, &seller.Rating, &seller.SalesCount, &seller.CreatedAt)
	if err != nil {
		return item, nil, nil // Return item without seller if profile query fails
	}
	return item, &seller, nil
}
