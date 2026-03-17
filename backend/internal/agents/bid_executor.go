package agents

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/zimlivestock/backend/internal/database"
	"github.com/zimlivestock/backend/internal/models"
)

// BidResult is the outcome of a single bid placement.
type BidResult struct {
	BidID    string
	Amount   float64
	Strategy string
}

// BidExecutor handles shared bid placement logic used by both BuyerAgent and SniperAgent.
type BidExecutor struct {
	db *database.DB
}

// NewBidExecutor creates a new BidExecutor.
func NewBidExecutor(db *database.DB) *BidExecutor {
	return &BidExecutor{db: db}
}

// PlaceBid atomically places a bid in the bids table, syncs the listing's current_bid,
// records the bid in agent_bids, and logs the activity.
func (e *BidExecutor) PlaceBid(ctx context.Context, agentID, goalID, livestockID string, amount float64, strategy string) (*BidResult, error) {
	// Look up the agent to get the user_id for the bids table.
	agent, err := e.db.GetAgentByID(ctx, agentID)
	if err != nil {
		return nil, fmt.Errorf("get agent for bid: %w", err)
	}

	// Place the bid in the bids table (atomic transaction).
	bid, err := e.db.PlaceBid(ctx, livestockID, agent.UserID, amount)
	if err != nil {
		return nil, fmt.Errorf("place bid: %w", err)
	}

	// Sync the listing's current_bid and bid_count from the bids table
	// to correct any potential drift.
	if err := e.db.SyncListingBid(ctx, livestockID); err != nil {
		slog.Warn("sync listing bid failed (non-fatal)",
			"livestock_id", livestockID,
			"error", err,
		)
	}

	// Record in agent_bids for tracking.
	agentBid := &models.AgentBid{
		AgentID:     agentID,
		GoalID:      &goalID,
		LivestockID: livestockID,
		BidID:       &bid.ID,
		Amount:      amount,
		Strategy:    strategy,
		Status:      "placed",
	}
	if err := e.db.RecordAgentBid(ctx, agentBid); err != nil {
		return nil, fmt.Errorf("record agent bid: %w", err)
	}

	// Log the activity.
	_ = e.db.LogAgentActivity(ctx, agentID, "bid_placed", fmt.Sprintf(
		"Placed %s bid of US$%.2f on listing %s", strategy, amount, livestockID,
	), map[string]any{
		"bid_id":       bid.ID,
		"livestock_id": livestockID,
		"amount":       amount,
		"strategy":     strategy,
		"goal_id":      goalID,
	})

	slog.Info("bid placed successfully",
		"agent_id", agentID,
		"bid_id", bid.ID,
		"livestock_id", livestockID,
		"amount", amount,
		"strategy", strategy,
	)

	return &BidResult{
		BidID:    bid.ID,
		Amount:   amount,
		Strategy: strategy,
	}, nil
}
